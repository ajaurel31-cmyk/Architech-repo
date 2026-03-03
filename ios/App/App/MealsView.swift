import SwiftUI

struct MealsView: View {
    @EnvironmentObject var storeKit: StoreKitManager
    @State private var selectedMeal: MealType?
    @State private var recommendations: [MealRecommendation] = []
    @State private var favorites: [MealRecommendation] = []
    @State private var showFavorites = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let storage = StorageManager.shared

    var body: some View {
        Group {
            if !storeKit.mealRecommendationsUnlocked {
                PaywallView(
                    title: "Unlock Meal Recommendations",
                    description: "Get personalized meal ideas tailored for post-kidney transplant patients.",
                    icon: "fork.knife",
                    features: [
                        "Breakfast, lunch, dinner & snack ideas",
                        "Post-transplant-safe ingredients",
                        "Save your favorite meals",
                        "Daily menu stays consistent"
                    ],
                    productID: StoreKitManager.mealRecommendationsID
                )
            } else {
                mealsContent
            }
        }
        .background(AppTheme.background)
        .navigationTitle("Meal Recommendations")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            favorites = storage.load(forKey: StorageKey.mealFavorites, defaultValue: [])
        }
    }

    // MARK: - Meals Content

    private var mealsContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Disclaimer
                DisclaimerBanner()

                // Tabs: Daily Menu / Favorites
                HStack(spacing: 0) {
                    tabButton(title: "Daily Menu", icon: "calendar", selected: !showFavorites) {
                        showFavorites = false
                    }
                    tabButton(title: "Favorites (\(favorites.count))", icon: "heart.fill", selected: showFavorites) {
                        showFavorites = true
                    }
                }
                .background(AppTheme.card)
                .cornerRadius(10)

                if showFavorites {
                    favoritesSection
                } else {
                    dailyMenuSection
                }
            }
            .padding()
        }
    }

    // MARK: - Tab Button

    private func tabButton(title: String, icon: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.subheadline.weight(selected ? .semibold : .regular))
            }
            .foregroundColor(selected ? AppTheme.primary : AppTheme.grayLight)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(selected ? AppTheme.primary.opacity(0.1) : Color.clear)
            .cornerRadius(10)
        }
    }

    // MARK: - Daily Menu

    private var dailyMenuSection: some View {
        VStack(spacing: 12) {
            // Meal Type Buttons
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(MealType.allCases, id: \.self) { type in
                    Button {
                        selectedMeal = type
                        Task { await loadMeals(type: type) }
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: type.icon)
                                .font(.title2)
                            Text(type.displayName)
                                .font(.subheadline.bold())
                        }
                        .foregroundColor(selectedMeal == type ? .white : AppTheme.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(selectedMeal == type ? AppTheme.primary : AppTheme.primary.opacity(0.1))
                        .cornerRadius(12)
                    }
                }
            }

            // Loading
            if isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Finding transplant-safe meals...")
                        .font(.caption)
                        .foregroundColor(AppTheme.grayLight)
                }
                .padding(.vertical, 32)
            }

            // Error
            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(AppTheme.avoid)
                    .padding()
                    .background(AppTheme.avoid.opacity(0.1))
                    .cornerRadius(8)
            }

            // Recommendations
            ForEach(recommendations) { meal in
                mealCard(meal)
            }
        }
    }

    // MARK: - Favorites

    private var favoritesSection: some View {
        VStack(spacing: 12) {
            if favorites.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "heart")
                        .font(.system(size: 40))
                        .foregroundColor(AppTheme.grayLight)
                    Text("No favorites yet")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.grayLight)
                    Text("Tap the heart icon on any meal to save it")
                        .font(.caption)
                        .foregroundColor(AppTheme.grayLight)
                }
                .padding(.vertical, 40)
            } else {
                ForEach(favorites) { meal in
                    mealCard(meal)
                }
            }
        }
    }

    // MARK: - Meal Card

    private func mealCard(_ meal: MealRecommendation) -> some View {
        let isFav = favorites.contains { $0.name == meal.name }

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(meal.name)
                    .font(.subheadline.bold())
                    .foregroundColor(AppTheme.text)
                Spacer()
                Button {
                    toggleFavorite(meal)
                } label: {
                    Image(systemName: isFav ? "heart.fill" : "heart")
                        .foregroundColor(isFav ? .red : AppTheme.grayLight)
                }
            }

            Text(meal.description)
                .font(.caption)
                .foregroundColor(AppTheme.textLight)

            // Ingredients
            VStack(alignment: .leading, spacing: 4) {
                Text("Ingredients:")
                    .font(.caption.bold())
                    .foregroundColor(AppTheme.text)
                ForEach(meal.ingredients, id: \.self) { ingredient in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(AppTheme.primary)
                            .frame(width: 4, height: 4)
                        Text(ingredient)
                            .font(.caption2)
                            .foregroundColor(AppTheme.textLight)
                    }
                }
            }

            // Tips
            HStack(alignment: .top, spacing: 6) {
                Image(systemName: "lightbulb.fill")
                    .font(.caption2)
                    .foregroundColor(AppTheme.caution)
                Text(meal.tips)
                    .font(.caption2)
                    .foregroundColor(AppTheme.textLight)
                    .italic()
            }
            .padding(8)
            .background(AppTheme.caution.opacity(0.1))
            .cornerRadius(6)
        }
        .cardStyle()
    }

    // MARK: - Actions

    private func loadMeals(type: MealType) async {
        // Check cached daily menu
        let todayKey = "dailyMenu_\(todayString())"
        if let cached: DailyMenu = storage.load(forKey: todayKey, defaultValue: nil as DailyMenu?),
           let meals = cached.meals[type.rawValue], !meals.isEmpty {
            recommendations = meals
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let meals = try await APIService.shared.getMeals(type: type)
            recommendations = meals

            // Cache the daily menu
            let dailyMenu: DailyMenu = storage.load(forKey: todayKey, defaultValue: DailyMenu(date: todayString(), meals: [:]))
            var updatedMeals = dailyMenu.meals
            updatedMeals[type.rawValue] = meals
            let updated = DailyMenu(date: todayString(), meals: updatedMeals)
            storage.save(updated, forKey: todayKey)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func toggleFavorite(_ meal: MealRecommendation) {
        if let index = favorites.firstIndex(where: { $0.name == meal.name }) {
            favorites.remove(at: index)
        } else {
            favorites.append(meal)
        }
        storage.save(favorites, forKey: StorageKey.mealFavorites)
    }

    private func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

// Allow optional decoding for DailyMenu cache
extension StorageManager {
    func load<T: Codable>(forKey key: String, defaultValue: T?) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key),
              let value = try? JSONDecoder().decode(T.self, from: data) else {
            return defaultValue
        }
        return value
    }
}
