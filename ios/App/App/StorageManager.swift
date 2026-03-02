import Foundation

final class StorageManager {
    static let shared = StorageManager()
    private let defaults = UserDefaults.standard

    private init() {}

    func save<T: Codable>(_ value: T, forKey key: String) {
        if let data = try? JSONEncoder().encode(value) {
            defaults.set(data, forKey: key)
        }
    }

    func load<T: Codable>(forKey key: String, defaultValue: T) -> T {
        guard let data = defaults.data(forKey: key),
              let value = try? JSONDecoder().decode(T.self, from: data) else {
            return defaultValue
        }
        return value
    }

    func remove(forKey key: String) {
        defaults.removeObject(forKey: key)
    }

    func setBool(_ value: Bool, forKey key: String) {
        defaults.set(value, forKey: key)
    }

    func getBool(forKey key: String) -> Bool {
        defaults.bool(forKey: key)
    }

    func setString(_ value: String, forKey key: String) {
        defaults.set(value, forKey: key)
    }

    func getString(forKey key: String) -> String? {
        defaults.string(forKey: key)
    }
}

// MARK: - Storage Keys

enum StorageKey {
    static let medications = "medications"
    static let mealFavorites = "mealFavorites"
    static let vitalReadings = "vitalReadings"
    static let vitalsReminders = "vitalsReminders"
    static let mealsPurchased = "mealsPurchased"
    static let vitalsPremium = "vitalsPremium"
}
