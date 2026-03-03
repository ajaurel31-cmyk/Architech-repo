import SwiftUI
import Charts

struct VitalsView: View {
    @EnvironmentObject var storeKit: StoreKitManager
    @State private var readings: [VitalReading] = []
    @State private var reminders = ReminderSettings.default
    @State private var activeTab: VitalsTab = .log
    @State private var showAddForm = false
    @State private var selectedTimeOfDay: TimeOfDay = .morning

    // Form fields
    @State private var systolicText = ""
    @State private var diastolicText = ""
    @State private var glucoseText = ""
    @State private var notesText = ""

    private let storage = StorageManager.shared

    enum VitalsTab: String, CaseIterable {
        case log = "Log"
        case chart = "Charts"
        case settings = "Settings"
    }

    var body: some View {
        Group {
            if !storeKit.healthVitalsUnlocked {
                PaywallView(
                    title: "Unlock Health Vitals",
                    description: "Track your blood pressure and glucose with charts and reminders.",
                    icon: "heart.fill",
                    features: [
                        "Log BP & Glucose 3x daily",
                        "Morning, Afternoon & Bedtime reminders",
                        "Visual charts & trends",
                        "Weekly averages",
                        "Health status indicators"
                    ],
                    productID: StoreKitManager.healthVitalsID
                )
            } else {
                vitalsContent
            }
        }
        .background(AppTheme.background)
        .navigationTitle("Health Vitals")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            readings = storage.load(forKey: StorageKey.vitalReadings, defaultValue: [])
            reminders = storage.load(forKey: StorageKey.vitalsReminders, defaultValue: .default)
        }
    }

    // MARK: - Main Content

    private var vitalsContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Disclaimer
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(AppTheme.caution)
                        .font(.caption)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("This tool is for tracking only. Always consult your healthcare provider for medical advice.")
                            .font(.caption2)
                            .foregroundColor(AppTheme.textLight)
                        NavigationLink(destination: DisclaimerView()) {
                            Text("Read full disclaimer")
                                .font(.caption2)
                                .foregroundColor(AppTheme.primary)
                        }
                    }
                }
                .padding(10)
                .background(AppTheme.caution.opacity(0.1))
                .cornerRadius(8)

                // Tabs
                HStack(spacing: 0) {
                    ForEach(VitalsTab.allCases, id: \.self) { tab in
                        Button {
                            activeTab = tab
                        } label: {
                            Text(tab.rawValue)
                                .font(.subheadline.weight(activeTab == tab ? .semibold : .regular))
                                .foregroundColor(activeTab == tab ? AppTheme.primary : AppTheme.grayLight)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(activeTab == tab ? AppTheme.primary.opacity(0.1) : Color.clear)
                                .cornerRadius(8)
                        }
                    }
                }
                .background(AppTheme.card)
                .cornerRadius(10)

                switch activeTab {
                case .log:
                    logSection
                case .chart:
                    chartSection
                case .settings:
                    settingsSection
                }
            }
            .padding()
        }
    }

    // MARK: - Log Section

    private var logSection: some View {
        VStack(spacing: 12) {
            // Today's Status
            let todayReadings = readings.filter { $0.date == todayString() }

            if todayReadings.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "heart.text.square")
                        .font(.system(size: 36))
                        .foregroundColor(AppTheme.grayLight)
                    Text("No readings today")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.grayLight)
                }
                .padding(.vertical, 20)
            } else {
                ForEach(todayReadings) { reading in
                    readingCard(reading)
                }
            }

            // Add Reading Button
            Button {
                showAddForm = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Reading")
                }
                .primaryButton()
            }
            .sheet(isPresented: $showAddForm) {
                addReadingSheet
            }
        }
    }

    // MARK: - Reading Card

    private func readingCard(_ reading: VitalReading) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: reading.timeOfDay.icon)
                    .foregroundColor(AppTheme.primary)
                Text(reading.timeOfDay.displayName)
                    .font(.subheadline.bold())
                Spacer()
                Button {
                    deleteReading(reading)
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(AppTheme.avoid)
                }
            }

            HStack(spacing: 16) {
                if let sys = reading.systolic, let dia = reading.diastolic {
                    VStack(alignment: .leading) {
                        Text("Blood Pressure")
                            .font(.caption2)
                            .foregroundColor(AppTheme.grayLight)
                        Text("\(sys)/\(dia)")
                            .font(.title3.bold())
                        let status = VitalStatus.bpStatus(systolic: sys, diastolic: dia)
                        Text(status.label)
                            .font(.caption2.bold())
                            .foregroundColor(Color(hex: status.color))
                    }
                }

                if let glucose = reading.glucose {
                    VStack(alignment: .leading) {
                        Text("Glucose")
                            .font(.caption2)
                            .foregroundColor(AppTheme.grayLight)
                        Text("\(glucose) mg/dL")
                            .font(.title3.bold())
                        let status = VitalStatus.glucoseStatus(value: glucose, timeOfDay: reading.timeOfDay)
                        Text(status.label)
                            .font(.caption2.bold())
                            .foregroundColor(Color(hex: status.color))
                    }
                }
            }

            if let notes = reading.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(AppTheme.textLight)
                    .italic()
            }
        }
        .cardStyle()
    }

    // MARK: - Add Reading Sheet

    private var addReadingSheet: some View {
        NavigationStack {
            Form {
                Section("Time of Day") {
                    Picker("Time", selection: $selectedTimeOfDay) {
                        ForEach(TimeOfDay.allCases, id: \.self) { time in
                            Text(time.displayName).tag(time)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Blood Pressure") {
                    TextField("Systolic (top number)", text: $systolicText)
                        .keyboardType(.numberPad)
                    TextField("Diastolic (bottom number)", text: $diastolicText)
                        .keyboardType(.numberPad)
                }

                Section("Glucose") {
                    TextField("Glucose (mg/dL)", text: $glucoseText)
                        .keyboardType(.numberPad)
                }

                Section("Notes (optional)") {
                    TextField("Any notes...", text: $notesText)
                }
            }
            .navigationTitle("Add Reading")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showAddForm = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveReading() }
                        .disabled(systolicText.isEmpty && diastolicText.isEmpty && glucoseText.isEmpty)
                }
            }
        }
    }

    // MARK: - Chart Section

    private var chartSection: some View {
        VStack(spacing: 16) {
            let last7Days = getLast7DaysReadings()

            if last7Days.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 36))
                        .foregroundColor(AppTheme.grayLight)
                    Text("Add readings to see charts")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.grayLight)
                }
                .padding(.vertical, 40)
            } else {
                // Blood Pressure Chart
                VStack(alignment: .leading, spacing: 8) {
                    Text("Blood Pressure (7 days)")
                        .font(.subheadline.bold())

                    Chart(last7Days.filter { $0.systolic != nil }) { reading in
                        LineMark(
                            x: .value("Date", reading.date),
                            y: .value("Systolic", reading.systolic ?? 0)
                        )
                        .foregroundStyle(AppTheme.avoid)
                        .symbol(Circle())

                        if let dia = reading.diastolic {
                            LineMark(
                                x: .value("Date", reading.date),
                                y: .value("Diastolic", dia)
                            )
                            .foregroundStyle(AppTheme.primary)
                            .symbol(Circle())
                        }
                    }
                    .frame(height: 200)
                    .chartYAxisLabel("mmHg")
                }
                .cardStyle()

                // Glucose Chart
                VStack(alignment: .leading, spacing: 8) {
                    Text("Glucose (7 days)")
                        .font(.subheadline.bold())

                    Chart(last7Days.filter { $0.glucose != nil }) { reading in
                        LineMark(
                            x: .value("Date", reading.date),
                            y: .value("Glucose", reading.glucose ?? 0)
                        )
                        .foregroundStyle(AppTheme.caution)
                        .symbol(Circle())
                    }
                    .frame(height: 200)
                    .chartYAxisLabel("mg/dL")
                }
                .cardStyle()

                // Weekly Averages
                weeklyAverages(last7Days)
            }
        }
    }

    private func weeklyAverages(_ readings: [VitalReading]) -> some View {
        let bpReadings = readings.filter { $0.systolic != nil }
        let glucoseReadings = readings.filter { $0.glucose != nil }

        let avgSys = bpReadings.isEmpty ? 0 : bpReadings.compactMap(\.systolic).reduce(0, +) / bpReadings.count
        let avgDia = bpReadings.isEmpty ? 0 : bpReadings.compactMap(\.diastolic).reduce(0, +) / bpReadings.count
        let avgGlucose = glucoseReadings.isEmpty ? 0 : glucoseReadings.compactMap(\.glucose).reduce(0, +) / glucoseReadings.count

        return VStack(alignment: .leading, spacing: 8) {
            Text("Weekly Averages")
                .font(.subheadline.bold())

            HStack(spacing: 16) {
                if avgSys > 0 {
                    VStack {
                        Text("BP")
                            .font(.caption2)
                            .foregroundColor(AppTheme.grayLight)
                        Text("\(avgSys)/\(avgDia)")
                            .font(.headline.bold())
                            .foregroundColor(AppTheme.text)
                    }
                    .frame(maxWidth: .infinity)
                }

                if avgGlucose > 0 {
                    VStack {
                        Text("Glucose")
                            .font(.caption2)
                            .foregroundColor(AppTheme.grayLight)
                        Text("\(avgGlucose)")
                            .font(.headline.bold())
                            .foregroundColor(AppTheme.text)
                    }
                    .frame(maxWidth: .infinity)
                }

                VStack {
                    Text("Readings")
                        .font(.caption2)
                        .foregroundColor(AppTheme.grayLight)
                    Text("\(readings.count)")
                        .font(.headline.bold())
                        .foregroundColor(AppTheme.text)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .cardStyle()
    }

    // MARK: - Settings Section

    private var settingsSection: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                Toggle("Enable Reminders", isOn: $reminders.enabled)
                    .tint(AppTheme.primary)
                    .onChange(of: reminders.enabled) { _ in
                        saveReminders()
                        if reminders.enabled {
                            Task { await NotificationManager.shared.requestPermission() }
                            scheduleVitalsReminders()
                        }
                    }

                if reminders.enabled {
                    reminderTimePicker(label: "Morning", time: $reminders.morning)
                    reminderTimePicker(label: "Afternoon", time: $reminders.afternoon)
                    reminderTimePicker(label: "Bedtime", time: $reminders.bedtime)
                }
            }
            .cardStyle()

            // Reference Values
            VStack(alignment: .leading, spacing: 8) {
                Text("Reference Values")
                    .font(.subheadline.bold())

                referenceRow(label: "Normal BP", value: "< 120/80 mmHg", color: AppTheme.safe)
                referenceRow(label: "Elevated BP", value: "120-129/< 80 mmHg", color: AppTheme.caution)
                referenceRow(label: "Fasting Glucose", value: "< 100 mg/dL", color: AppTheme.safe)
                referenceRow(label: "Prediabetic", value: "100-125 mg/dL", color: AppTheme.caution)
            }
            .cardStyle()
        }
    }

    private func reminderTimePicker(label: String, time: Binding<String>) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(time.wrappedValue)
                .font(.subheadline)
                .foregroundColor(AppTheme.primary)
        }
    }

    private func referenceRow(label: String, value: String, color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label)
                .font(.caption)
                .foregroundColor(AppTheme.text)
            Spacer()
            Text(value)
                .font(.caption)
                .foregroundColor(AppTheme.textLight)
        }
    }

    // MARK: - Actions

    private func saveReading() {
        let reading = VitalReading(
            date: todayString(),
            timeOfDay: selectedTimeOfDay,
            systolic: Int(systolicText),
            diastolic: Int(diastolicText),
            glucose: Int(glucoseText),
            notes: notesText.isEmpty ? nil : notesText
        )
        readings.append(reading)
        storage.save(readings, forKey: StorageKey.vitalReadings)

        // Reset form
        systolicText = ""
        diastolicText = ""
        glucoseText = ""
        notesText = ""
        showAddForm = false
    }

    private func deleteReading(_ reading: VitalReading) {
        readings.removeAll { $0.id == reading.id }
        storage.save(readings, forKey: StorageKey.vitalReadings)
    }

    private func saveReminders() {
        storage.save(reminders, forKey: StorageKey.vitalsReminders)
    }

    private func scheduleVitalsReminders() {
        let nm = NotificationManager.shared
        nm.scheduleVitalsReminder(timeOfDay: "Morning", time: reminders.morning, identifier: "vitals_morning")
        nm.scheduleVitalsReminder(timeOfDay: "Afternoon", time: reminders.afternoon, identifier: "vitals_afternoon")
        nm.scheduleVitalsReminder(timeOfDay: "Bedtime", time: reminders.bedtime, identifier: "vitals_bedtime")
    }

    private func getLast7DaysReadings() -> [VitalReading] {
        let calendar = Calendar.current
        let sevenDaysAgo = calendar.date(byAdding: .day, value: -7, to: Date())!
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let cutoff = formatter.string(from: sevenDaysAgo)
        return readings.filter { $0.date >= cutoff }.sorted { $0.date < $1.date }
    }

    private func todayString() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}
