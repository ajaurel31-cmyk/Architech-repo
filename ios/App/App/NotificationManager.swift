import UserNotifications

final class NotificationManager {
    static let shared = NotificationManager()

    private init() {}

    func requestPermission() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            return false
        }
    }

    func scheduleMedicationReminder(medication: Medication) {
        let center = UNUserNotificationCenter.current()

        // Remove existing notifications for this medication
        let ids = medication.times.enumerated().map { "\(medication.id)_\($0.offset)" }
        center.removePendingNotificationRequests(withIdentifiers: ids)

        for (index, time) in medication.times.enumerated() {
            let components = time.split(separator: ":")
            guard components.count == 2,
                  let hour = Int(components[0]),
                  let minute = Int(components[1]) else { continue }

            let content = UNMutableNotificationContent()
            content.title = "Medication Reminder"
            content.body = "Time to take \(medication.name) (\(medication.dosage))"
            if medication.withFood {
                content.body += " — Take with food"
            }
            content.sound = .default

            var dateComponents = DateComponents()
            dateComponents.hour = hour
            dateComponents.minute = minute

            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
            let request = UNNotificationRequest(identifier: "\(medication.id)_\(index)", content: content, trigger: trigger)

            center.add(request)
        }
    }

    func scheduleVitalsReminder(timeOfDay: String, time: String, identifier: String) {
        let components = time.split(separator: ":")
        guard components.count == 2,
              let hour = Int(components[0]),
              let minute = Int(components[1]) else { return }

        let content = UNMutableNotificationContent()
        content.title = "\(timeOfDay) Vitals Reminder"
        content.body = "Time to check your blood pressure and glucose!"
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request)
    }

    func cancelReminder(identifier: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
    }

    func cancelAllMedicationReminders(for medication: Medication) {
        let ids = medication.times.enumerated().map { "\(medication.id)_\($0.offset)" }
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
    }
}
