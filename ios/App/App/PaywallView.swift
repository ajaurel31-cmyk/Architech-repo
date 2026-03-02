import SwiftUI

struct PaywallView: View {
    let title: String
    let description: String
    let icon: String
    let features: [String]
    let productID: String
    @EnvironmentObject var storeKit: StoreKitManager
    @State private var isPurchasing = false

    var body: some View {
        VStack(spacing: 20) {
            // Icon
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(AppTheme.primary)
                .padding(.top, 20)

            // Title
            Text(title)
                .font(.title2.bold())
                .foregroundColor(AppTheme.text)
                .multilineTextAlignment(.center)

            // Description
            Text(description)
                .font(.subheadline)
                .foregroundColor(AppTheme.textLight)
                .multilineTextAlignment(.center)

            // Features
            VStack(alignment: .leading, spacing: 10) {
                ForEach(features, id: \.self) { feature in
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark")
                            .font(.caption.bold())
                            .foregroundColor(AppTheme.safe)
                        Text(feature)
                            .font(.subheadline)
                            .foregroundColor(AppTheme.text)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.primary.opacity(0.05))
            .cornerRadius(12)

            // Price
            VStack(spacing: 4) {
                Text(storeKit.priceString(for: productID))
                    .font(.title.bold())
                    .foregroundColor(AppTheme.primary)
                Text("One-time purchase")
                    .font(.caption)
                    .foregroundColor(AppTheme.grayLight)
            }

            // Error Display
            if let error = storeKit.purchaseError {
                VStack(spacing: 8) {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(AppTheme.avoid)
                        .multilineTextAlignment(.center)

                    Button("Try Again") {
                        Task { await purchase() }
                    }
                    .font(.caption.bold())
                    .foregroundColor(AppTheme.primary)
                }
                .padding()
                .background(AppTheme.avoid.opacity(0.1))
                .cornerRadius(8)
            }

            // Purchase Button
            Button {
                Task { await purchase() }
            } label: {
                if isPurchasing {
                    HStack {
                        ProgressView().tint(.white)
                        Text("Processing...")
                    }
                    .primaryButton()
                } else {
                    Text("Unlock Now — \(storeKit.priceString(for: productID))")
                        .primaryButton()
                }
            }
            .disabled(isPurchasing)

            // Restore Button
            Button {
                Task { await restore() }
            } label: {
                Text(isPurchasing ? "Restoring..." : "Restore Purchase")
                    .secondaryButton()
            }
            .disabled(isPurchasing)

            // Legal Links
            VStack(spacing: 6) {
                Text("Your data is stored locally on your device and never shared.")
                    .font(.caption2)
                    .foregroundColor(AppTheme.grayLight)

                HStack(spacing: 4) {
                    Text("By purchasing, you agree to our")
                        .font(.caption2)
                        .foregroundColor(AppTheme.grayLight)
                    NavigationLink("Terms of Use") {
                        DisclaimerView()
                    }
                    .font(.caption2)
                    Text("and")
                        .font(.caption2)
                        .foregroundColor(AppTheme.grayLight)
                    NavigationLink("Privacy Policy") {
                        PrivacyView()
                    }
                    .font(.caption2)
                }
            }
            .padding(.top, 4)

            Spacer()
        }
        .padding()
    }

    private func purchase() async {
        isPurchasing = true
        await storeKit.purchase(productID)
        isPurchasing = false
    }

    private func restore() async {
        isPurchasing = true
        await storeKit.restorePurchases()
        isPurchasing = false
    }
}
