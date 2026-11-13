import Foundation
import Capacitor
import QuickLook

/// Presents a local file (USDZ) in QLPreviewController, which offers native
/// AR Quick Look ("AR" / "Object" modes) for USDZ content. This replaces the
/// Safari-only `<a rel="ar">` trigger, which does nothing inside WKWebView.
@objc(QuickLookPlugin)
public class QuickLookPlugin: CAPPlugin, CAPBridgedPlugin, QLPreviewControllerDataSource {
    public let identifier = "QuickLookPlugin"
    public let jsName = "QuickLook"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise)
    ]

    private var previewURL: URL?

    @objc func present(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), let url = URL(string: path), url.isFileURL else {
            call.reject("A local file:// path is required")
            return
        }
        guard FileManager.default.fileExists(atPath: url.path) else {
            call.reject("File not found")
            return
        }
        previewURL = url
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let presenter = self.bridge?.viewController else {
                call.reject("No view controller available")
                return
            }
            let controller = QLPreviewController()
            controller.dataSource = self
            presenter.present(controller, animated: true) {
                call.resolve()
            }
        }
    }

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        return previewURL == nil ? 0 : 1
    }

    public func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        return previewURL! as NSURL
    }
}
