import Foundation
import UIKit

final class APIService {
    static let shared = APIService()
    private let baseURL = "https://kidneycare.app"

    private init() {}

    // MARK: - Analyze Nutrition Labels

    func analyzeImages(_ images: [UIImage]) async throws -> AnalysisResult {
        let url = URL(string: "\(baseURL)/api/analyze")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60

        let base64Images = images.compactMap { image -> String? in
            guard let data = image.jpegData(compressionQuality: 0.8) else { return nil }
            return "data:image/jpeg;base64,\(data.base64EncodedString())"
        }

        let body = AnalysisRequest(images: base64Images)
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorBody = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.error)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(AnalysisResult.self, from: data)
    }

    // MARK: - Get Meal Recommendations

    func getMeals(type: MealType) async throws -> [MealRecommendation] {
        let url = URL(string: "\(baseURL)/api/meals")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60

        let body: [String: String] = ["mealType": type.rawValue]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        let mealsResponse = try JSONDecoder().decode(MealsResponse.self, from: data)
        return mealsResponse.meals.map { meal in
            var m = meal
            m.mealType = type.rawValue
            return m
        }
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "Server error (code \(code))"
        case .serverError(let message):
            return message
        }
    }
}

struct ErrorResponse: Codable {
    let error: String
}
