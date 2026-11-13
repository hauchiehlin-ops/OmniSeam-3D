import UIKit
import Capacitor

/// Root view controller: registers the app's local (in-project) Capacitor plugins.
class OmniSeamBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(QuickLookPlugin())
    }
}
