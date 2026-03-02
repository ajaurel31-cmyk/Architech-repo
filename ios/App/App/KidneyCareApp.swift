import SwiftUI

@main
struct KidneyCareApp: App {
    @StateObject private var storeKit = StoreKitManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(storeKit)
                .task {
                    await storeKit.loadProducts()
                    await storeKit.checkEntitlements()
                }
        }
    }
}
