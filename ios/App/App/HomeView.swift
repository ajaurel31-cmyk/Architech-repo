import SwiftUI
import PhotosUI

struct HomeView: View {
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var images: [IdentifiableImage] = []
    @State private var isAnalyzing = false
    @State private var result: AnalysisResult?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Medical Disclaimer Banner
                DisclaimerBanner()

                // Header
                VStack(spacing: 4) {
                    Text("Post-Kidney Transplant Nutrition Guide")
                        .font(.title2.bold())
                        .foregroundColor(AppTheme.text)
                        .multilineTextAlignment(.center)
                    Text("Upload nutrition facts to check if they're safe for post-kidney transplant patients")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textLight)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal)

                // Upload Card
                VStack(spacing: 16) {
                    // Photo Picker
                    PhotosPicker(selection: $selectedItems, maxSelectionCount: 4, matching: .images) {
                        VStack(spacing: 12) {
                            Image(systemName: "photo.on.rectangle.angled")
                                .font(.system(size: 40))
                                .foregroundColor(AppTheme.primary)
                            Text("Upload Nutrition Facts")
                                .font(.headline)
                                .foregroundColor(AppTheme.text)
                            Text("Select up to 4 images")
                                .font(.caption)
                                .foregroundColor(AppTheme.grayLight)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 32)
                        .background(AppTheme.primary.opacity(0.05))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(AppTheme.primary.opacity(0.3), style: StrokeStyle(lineWidth: 2, dash: [8]))
                        )
                    }
                    .onChange(of: selectedItems) { _ in
                        loadImages()
                    }

                    // Image Previews
                    if !images.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(images) { img in
                                    ZStack(alignment: .topTrailing) {
                                        Image(uiImage: img.image)
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 80, height: 80)
                                            .cornerRadius(8)
                                            .clipped()

                                        Button {
                                            images.removeAll { $0.id == img.id }
                                            selectedItems = []
                                        } label: {
                                            Image(systemName: "xmark.circle.fill")
                                                .foregroundColor(.red)
                                                .background(Circle().fill(.white).padding(2))
                                        }
                                        .offset(x: 4, y: -4)
                                    }
                                }
                            }
                        }

                        Text("\(images.count) image\(images.count == 1 ? "" : "s") selected")
                            .font(.caption)
                            .foregroundColor(AppTheme.grayLight)

                        Button("Clear All") {
                            images = []
                            selectedItems = []
                            result = nil
                            errorMessage = nil
                        }
                        .font(.caption)
                        .foregroundColor(AppTheme.avoid)
                    }

                    // Analyze Button
                    Button {
                        Task { await analyze() }
                    } label: {
                        if isAnalyzing {
                            HStack {
                                ProgressView()
                                    .tint(.white)
                                Text("Analyzing...")
                            }
                            .primaryButton()
                        } else {
                            Text("Check Food Safety")
                                .primaryButton()
                        }
                    }
                    .disabled(images.isEmpty || isAnalyzing)
                    .opacity(images.isEmpty ? 0.5 : 1)

                    // Error
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(AppTheme.avoid)
                            .padding(8)
                            .frame(maxWidth: .infinity)
                            .background(AppTheme.avoid.opacity(0.1))
                            .cornerRadius(8)
                    }

                    // Results
                    if let result = result {
                        AnalysisResultView(result: result)
                    }
                }
                .cardStyle()

                // Feature Links
                VStack(spacing: 12) {
                    NavigationLink(destination: MealsView()) {
                        FeatureLinkRow(icon: "fork.knife", title: "Meal Recommendations", subtitle: "Get post-kidney transplant-safe meal ideas")
                    }

                    NavigationLink(destination: MedicationsView()) {
                        FeatureLinkRow(icon: "pills.fill", title: "Medication Reminders", subtitle: "Never miss your immunosuppressants")
                    }

                    NavigationLink(destination: VitalsView()) {
                        FeatureLinkRow(icon: "heart.fill", title: "Health Vitals", subtitle: "Track blood pressure & glucose")
                    }
                }

                // Footer
                FooterView()
            }
            .padding()
        }
        .background(AppTheme.background)
        .navigationBarHidden(true)
    }

    // MARK: - Load Images

    private func loadImages() {
        Task {
            var loaded: [IdentifiableImage] = []
            for item in selectedItems {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let uiImage = UIImage(data: data) {
                    loaded.append(IdentifiableImage(image: uiImage))
                }
            }
            images = loaded
            result = nil
            errorMessage = nil
        }
    }

    // MARK: - Analyze

    private func analyze() async {
        guard !images.isEmpty else { return }
        isAnalyzing = true
        errorMessage = nil

        do {
            let uiImages = images.map { $0.image }
            result = try await APIService.shared.analyzeImages(uiImages)
        } catch {
            errorMessage = error.localizedDescription
        }

        isAnalyzing = false
    }
}

// MARK: - Supporting Views

struct IdentifiableImage: Identifiable {
    let id = UUID()
    let image: UIImage
}

struct DisclaimerBanner: View {
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(AppTheme.caution)
                .font(.caption)
            VStack(alignment: .leading, spacing: 2) {
                Text("Medical Disclaimer:")
                    .font(.caption.bold())
                Text("This app is for informational purposes only. Always consult your transplant care team before making dietary changes.")
                    .font(.caption2)
                    .foregroundColor(AppTheme.textLight)
            }
        }
        .padding(12)
        .background(AppTheme.caution.opacity(0.1))
        .cornerRadius(10)
    }
}

struct FeatureLinkRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(AppTheme.primary)
                .frame(width: 44, height: 44)
                .background(AppTheme.primary.opacity(0.1))
                .cornerRadius(12)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundColor(AppTheme.text)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(AppTheme.textLight)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(AppTheme.grayLight)
        }
        .padding()
        .background(AppTheme.card)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
    }
}

struct AnalysisResultView: View {
    let result: AnalysisResult

    private var verdictColor: Color {
        switch result.verdict {
        case "safe": return AppTheme.safe
        case "caution": return AppTheme.caution
        default: return AppTheme.avoid
        }
    }

    private var verdictIcon: String {
        switch result.verdict {
        case "safe": return "checkmark.circle.fill"
        case "caution": return "exclamationmark.triangle.fill"
        default: return "xmark.circle.fill"
        }
    }

    private var verdictTitle: String {
        switch result.verdict {
        case "safe": return "Generally Safe for Post-Transplant Patients"
        case "caution": return "Use Caution - Check with Your Care Team"
        default: return "Best to Avoid After Transplant"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Verdict Header
            HStack {
                Image(systemName: verdictIcon)
                    .font(.title2)
                    .foregroundColor(verdictColor)
                Text("Analysis Results")
                    .font(.headline)
            }

            // Verdict Badge
            VStack(alignment: .leading, spacing: 4) {
                Text(verdictTitle)
                    .font(.subheadline.bold())
                    .foregroundColor(verdictColor)
                Text(result.summary)
                    .font(.caption)
                    .foregroundColor(AppTheme.textLight)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(verdictColor.opacity(0.1))
            .cornerRadius(10)

            // Analysis Content
            Text(result.analysis)
                .font(.caption)
                .foregroundColor(AppTheme.text)
                .lineSpacing(4)
        }
        .padding(.top, 8)
    }
}

struct FooterView: View {
    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 12) {
                NavigationLink("Terms of Use", destination: DisclaimerView())
                Text("|").foregroundColor(AppTheme.border)
                NavigationLink("Privacy Policy", destination: PrivacyView())
                Text("|").foregroundColor(AppTheme.border)
                NavigationLink("Support", destination: SupportView())
            }
            .font(.caption2)
            .foregroundColor(AppTheme.grayLight)

            Text("Need help? support@kidneycare.app")
                .font(.caption2)
                .foregroundColor(AppTheme.grayLight)

            Text("© \(Calendar.current.component(.year, from: Date())) KidneyCare+. All rights reserved.")
                .font(.caption2)
                .foregroundColor(AppTheme.grayLight)
        }
        .padding(.top, 16)
    }
}
