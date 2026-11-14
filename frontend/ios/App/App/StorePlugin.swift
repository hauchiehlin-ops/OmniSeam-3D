import Foundation
import Capacitor
import StoreKit
import Security

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
        CAPPluginMethod(name: "getServerTime", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSecureValue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSecureValue", returnType: CAPPluginReturnPromise),
    ]

    /// Host already contacted for remote config; its HTTPS `Date` header is the
    /// trusted clock used to stop trial extension by setting the device clock back.
    private let timeURL = URL(string: "https://hauchiehlin-ops.github.io/OmniSeam-3D/config.json")!
    private let keychainService = "io.github.hauchiehlinops.omniseam3d.clock"

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

    // MARK: - Trusted clock

    /// Server time from the HTTPS `Date` header (ms since epoch), or null when offline.
    @objc func getServerTime(_ call: CAPPluginCall) {
        var request = URLRequest(url: timeURL, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 4)
        request.httpMethod = "HEAD"
        let started = Date()
        URLSession.shared.dataTask(with: request) { _, response, error in
            guard error == nil,
                  let http = response as? HTTPURLResponse,
                  let header = http.value(forHTTPHeaderField: "Date"),
                  let date = StorePlugin.httpDateFormatter.date(from: header) else {
                call.resolve(["serverTime": NSNull()])
                return
            }
            // The Date header has 1 s resolution; add half the round trip.
            let rtt = Date().timeIntervalSince(started)
            call.resolve(["serverTime": (date.timeIntervalSince1970 + rtt / 2) * 1000])
        }.resume()
    }

    private static let httpDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "GMT")
        f.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        return f
    }()

    /// Keychain storage: survives app deletion and reinstall (unlike UserDefaults).
    @objc func getSecureValue(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key is required") }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data, let value = String(data: data, encoding: .utf8) {
            call.resolve(["value": value])
        } else {
            call.resolve(["value": NSNull()])
        }
    }

    @objc func setSecureValue(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            return call.reject("key and value are required")
        }
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
        ]
        let data = Data(value.utf8)
        let update: [String: Any] = [kSecValueData as String: data]
        var status = SecItemUpdate(base as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var add = base
            add[kSecValueData as String] = data
            add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            status = SecItemAdd(add as CFDictionary, nil)
        }
        status == errSecSuccess ? call.resolve() : call.reject("Keychain error \(status)")
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
