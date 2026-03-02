import SwiftUI

// MARK: - App Colors

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

enum AppTheme {
    static let primary = Color(hex: "2d8659")
    static let primaryDark = Color(hex: "1d5e3d")
    static let background = Color(hex: "f7f8fa")
    static let card = Color.white
    static let text = Color(hex: "1a2332")
    static let textLight = Color(hex: "4a5568")
    static let grayLight = Color(hex: "94a3b8")
    static let border = Color(hex: "e2e8f0")
    static let safe = Color(hex: "22c55e")
    static let caution = Color(hex: "f59e0b")
    static let avoid = Color(hex: "ef4444")
}

// MARK: - Card Modifier

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(AppTheme.card)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }

    func primaryButton() -> some View {
        self
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(AppTheme.primary)
            .cornerRadius(12)
    }

    func secondaryButton() -> some View {
        self
            .font(.subheadline)
            .foregroundColor(AppTheme.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(AppTheme.primary.opacity(0.1))
            .cornerRadius(10)
    }
}
