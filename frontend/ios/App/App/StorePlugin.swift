import Foundation
import Capacitor
import StoreKit

/// In-App Purchase bridge (StoreKit 2) for the Basic / Pro plans.
///
/// Products (App Store Connect → In-App Purchases, both Non-Consumable):
///   • `<bundle id>.pro`      – Pro one-time unlock
///   • `<bundle id>.trial7d`  – "7-Day Pro Trial", price tier 0 (Guideline 3.1.1
///                              time-limited trial for non-subscription apps)
///
/// StoreKit 2 verifies every transaction's JWS signature on device, so no
/// receipt server is needed. The JS side (src/platform/entitlements.ts) turns
/// the returned entitlements into a tier: trial = trial purchaseDate + 7 days.
@objc(StorePlugin)
public class StorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorePlugin"
    public let jsName = "Store"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlements", returnType: CAPPluginReturnPromise),
    ]

    private var updatesTask: Task<Void, Never>?
    private var products: [String: Product] = [:]

    override public func load() {
        // Purchases completed outside the app's purchase() call (Ask to Buy approval,
        // purchases on another device, refunds/revocations) arrive here.
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                await self?.emitEntitlements()
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - JS API

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let found = try await Product.products(for: ids)
                var list: [[String: Any]] = []
                for product in found {
                    products[product.id] = product
                    list.append([
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "displayPrice": product.displayPrice,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                    ])
                }
                call.resolve(["products": list])
            } catch {
                call.reject("Unable to load products: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId is required")
            return
        }
        Task {
            do {
                let product: Product
                if let cached = products[productId] {
                    product = cached
                } else if let fetched = try await Product.products(for: [productId]).first {
                    products[productId] = fetched
                    product = fetched
                } else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                let result = try await product.purchase()
                var status = "cancelled"
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        status = "purchased"
                    case .unverified(_, let error):
                        call.reject("Purchase could not be verified: \(error.localizedDescription)")
                        return
                    }
                case .pending:
                    status = "pending"   // Ask to Buy / SCA: completes later via Transaction.updates
                case .userCancelled:
                    status = "cancelled"
                @unknown default:
                    status = "cancelled"
                }
                var payload = await entitlementsPayload()
                payload["status"] = status
                call.resolve(payload)
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                // Prompts for Apple ID sign-in if needed and re-syncs all transactions.
                try await AppStore.sync()
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
                return
            }
            call.resolve(await entitlementsPayload())
        }
    }

    @objc func getEntitlements(_ call: CAPPluginCall) {
        Task {
            call.resolve(await entitlementsPayload())
        }
    }

    // MARK: - Helpers

    private func entitlementsPayload() async -> [String: Any] {
        var list: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if transaction.revocationDate != nil { continue }
            list.append([
                "productId": transaction.productID,
                "purchaseDate": transaction.purchaseDate.timeIntervalSince1970 * 1000,
                "originalPurchaseDate": transaction.originalPurchaseDate.timeIntervalSince1970 * 1000,
            ])
        }
        return [
            "entitlements": list,
            "now": Date().timeIntervalSince1970 * 1000,
        ]
    }

    private func emitEntitlements() async {
        let payload = await entitlementsPayload()
        notifyListeners("entitlementsChanged", data: payload)
    }
}
