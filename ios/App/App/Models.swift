import Foundation

// MARK: - Food Analysis

struct AnalysisResult: Codable {
    let verdict: String // "safe", "caution", "avoid"
    let summary: String
    let analysis: String
}

struct AnalysisRequest: Codable {
    let images: [String] // base64 data URLs
}

// MARK: - Meal Recommendations

struct MealRecommendation: Codable, Identifiable {
    var id: String { name }
    let name: String
    let description: String
    let ingredients: [String]
    let tips: String
    var mealType: String?

    enum CodingKeys: String, CodingKey {
        case name, description, ingredients, tips, mealType
    }
}

struct MealsResponse: Codable {
    let meals: [MealRecommendation]
}

struct DailyMenu: Codable {
    let date: String
    let meals: [String: [MealRecommendation]]
}

enum MealType: String, CaseIterable {
    case breakfast, lunch, dinner, snacks

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .breakfast: return "cup.and.saucer.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "moon.stars.fill"
        case .snacks: return "leaf.fill"
        }
    }
}

// MARK: - Health Vitals

enum TimeOfDay: String, CaseIterable, Codable {
    case morning, afternoon, bedtime

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .morning: return "sun.rise.fill"
        case .afternoon: return "sun.max.fill"
        case .bedtime: return "moon.fill"
        }
    }
}

struct VitalReading: Codable, Identifiable {
    let id: String
    var date: String
    var timeOfDay: TimeOfDay
    var timestamp: String
    var systolic: Int?
    var diastolic: Int?
    var glucose: Int?
    var notes: String?

    init(date: String, timeOfDay: TimeOfDay, systolic: Int? = nil, diastolic: Int? = nil, glucose: Int? = nil, notes: String? = nil) {
        self.id = UUID().uuidString
        self.date = date
        self.timeOfDay = timeOfDay
        self.timestamp = ISO8601DateFormatter().string(from: Date())
        self.systolic = systolic
        self.diastolic = diastolic
        self.glucose = glucose
        self.notes = notes
    }
}

struct ReminderSettings: Codable {
    var enabled: Bool
    var morning: String
    var afternoon: String
    var bedtime: String

    static let `default` = ReminderSettings(enabled: false, morning: "07:00", afternoon: "14:00", bedtime: "21:00")
}

// MARK: - Medications

struct Medication: Codable, Identifiable {
    let id: String
    var name: String
    var dosage: String
    var times: [String] // HH:MM strings
    var notes: String
    var withFood: Bool

    init(name: String = "", dosage: String = "", times: [String] = ["08:00"], notes: String = "", withFood: Bool = false) {
        self.id = UUID().uuidString
        self.name = name
        self.dosage = dosage
        self.times = times
        self.notes = notes
        self.withFood = withFood
    }
}

// MARK: - BP / Glucose Status

struct VitalStatus {
    let label: String
    let color: String // hex

    static func bpStatus(systolic: Int, diastolic: Int) -> VitalStatus {
        if systolic < 120 && diastolic < 80 {
            return VitalStatus(label: "Normal", color: "22c55e")
        } else if systolic < 130 && diastolic < 80 {
            return VitalStatus(label: "Elevated", color: "f59e0b")
        } else if systolic < 140 || diastolic < 90 {
            return VitalStatus(label: "High Stage 1", color: "f97316")
        } else {
            return VitalStatus(label: "High Stage 2", color: "ef4444")
        }
    }

    static func glucoseStatus(value: Int, timeOfDay: TimeOfDay) -> VitalStatus {
        if timeOfDay == .morning {
            if value < 100 { return VitalStatus(label: "Normal", color: "22c55e") }
            else if value < 126 { return VitalStatus(label: "Prediabetic", color: "f59e0b") }
            else { return VitalStatus(label: "Diabetic Range", color: "ef4444") }
        } else {
            if value < 140 { return VitalStatus(label: "Normal", color: "22c55e") }
            else if value < 200 { return VitalStatus(label: "Elevated", color: "f59e0b") }
            else { return VitalStatus(label: "High", color: "ef4444") }
        }
    }
}

// MARK: - Common Transplant Medications

struct CommonMedication {
    let name: String
    let defaultDosage: String
    let notes: String

    static let list: [CommonMedication] = [
        CommonMedication(name: "Tacrolimus (Prograf)", defaultDosage: "1mg", notes: "Take consistently with or without food. Avoid grapefruit."),
        CommonMedication(name: "Cyclosporine (Neoral)", defaultDosage: "100mg", notes: "Take consistently with or without food. Avoid grapefruit."),
        CommonMedication(name: "Mycophenolate (CellCept)", defaultDosage: "500mg", notes: "Take on an empty stomach if possible."),
        CommonMedication(name: "Prednisone", defaultDosage: "5mg", notes: "Take with food to reduce stomach upset."),
        CommonMedication(name: "Sirolimus (Rapamune)", defaultDosage: "1mg", notes: "Take consistently with or without food."),
        CommonMedication(name: "Azathioprine (Imuran)", defaultDosage: "50mg", notes: "Take with food to reduce nausea."),
    ]
}
