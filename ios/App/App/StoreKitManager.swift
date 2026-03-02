import StoreKit

@MainActor
final class StoreKitManager: ObservableObject {
    static let shared = StoreKitManager()

    @Published var healthVitalsUnlocked = false
    @Published var mealRecommendationsUnlocked = false
    @Published var products: [Product] = []
    @Published var purchaseError: String?

    static let healthVitalsID = "health_vitals_499"
    static let mealRecommendationsID = "meal_recommendations_499"

    private var updateTask: Task<Void, Never>?

    private init() {
        // Check local cache first
        healthVitalsUnlocked = StorageManager.shared.getBool(forKey: StorageKey.vitalsPremium)
        mealRecommendationsUnlocked = StorageManager.shared.getString(forKey: StorageKey.mealsPurchased) == "true"

        // Listen for transaction updates
        updateTask = Task {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await handleVerified(transaction)
                    await transaction.finish()
                }
            }
        }
    }

    deinit {
        updateTask?.cancel()
    }

    // MARK: - Load Products

    func loadProducts() async {
        do {
            let ids: Set<String> = [Self.healthVitalsID, Self.mealRecommendationsID]
            products = try await Product.products(for: ids)
        } catch {
            print("Failed to load products: \(error)")
        }
    }

    // MARK: - Purchase

    func purchase(_ productID: String) async {
        purchaseError = nil

        guard let product = products.first(where: { $0.id == productID }) else {
            // Try loading products first
            await loadProducts()
            guard let product = products.first(where: { $0.id == productID }) else {
                purchaseError = "This product is temporarily unavailable. Please try again."
                return
            }
            await doPurchase(product)
            return
        }

        await doPurchase(product)
    }

    private func doPurchase(_ product: Product) async {
        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    await handleVerified(transaction)
                    await transaction.finish()
                } else {
                    purchaseError = "Purchase could not be verified."
                }
            case .userCancelled:
                break
            case .pending:
                purchaseError = "Purchase is pending approval."
            @unknown default:
                purchaseError = "An unknown error occurred."
            }
        } catch {
            purchaseError = "Purchase failed: \(error.localizedDescription)"
        }
    }

    // MARK: - Restore

    func restorePurchases() async {
        purchaseError = nil
        do {
            try await AppStore.sync()
            await checkEntitlements()
        } catch {
            purchaseError = "Restore failed: \(error.localizedDescription)"
        }
    }

    // MARK: - Check Entitlements

    func checkEntitlements() async {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                await handleVerified(transaction)
            }
        }
    }

    // MARK: - Handle Transaction

    private func handleVerified(_ transaction: Transaction) async {
        switch transaction.productID {
        case Self.healthVitalsID:
            healthVitalsUnlocked = true
            StorageManager.shared.setBool(true, forKey: StorageKey.vitalsPremium)
        case Self.mealRecommendationsID:
            mealRecommendationsUnlocked = true
            StorageManager.shared.setString("true", forKey: StorageKey.mealsPurchased)
        default:
            break
        }
    }

    // MARK: - Price String

    func priceString(for productID: String) -> String {
        products.first(where: { $0.id == productID })?.displayPrice ?? "$4.99"
    }
}
