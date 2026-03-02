import SwiftUI

struct MedicationsView: View {
    @State private var medications: [Medication] = []
    @State private var showAddSheet = false
    @State private var editingMedication: Medication?

    private let storage = StorageManager.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Disclaimer
                DisclaimerBanner()

                if medications.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "pills.fill")
                            .font(.system(size: 40))
                            .foregroundColor(AppTheme.grayLight)
                        Text("No medications added yet")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.grayLight)
                        Text("Add your medications to set reminders")
                            .font(.caption)
                            .foregroundColor(AppTheme.grayLight)
                    }
                    .padding(.vertical, 40)
                } else {
                    ForEach(medications) { med in
                        medicationCard(med)
                    }
                }

                // Add Button
                Button {
                    showAddSheet = true
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Medication")
                    }
                    .primaryButton()
                }

                // Common Medications
                VStack(alignment: .leading, spacing: 8) {
                    Text("Common Transplant Medications")
                        .font(.subheadline.bold())
                        .foregroundColor(AppTheme.text)

                    ForEach(CommonMedication.list, id: \.name) { common in
                        Button {
                            let med = Medication(name: common.name, dosage: common.defaultDosage, notes: common.notes)
                            editingMedication = med
                            showAddSheet = true
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(common.name)
                                        .font(.caption.bold())
                                        .foregroundColor(AppTheme.text)
                                    Text(common.notes)
                                        .font(.caption2)
                                        .foregroundColor(AppTheme.textLight)
                                }
                                Spacer()
                                Image(systemName: "plus.circle")
                                    .foregroundColor(AppTheme.primary)
                            }
                            .padding(10)
                            .background(AppTheme.primary.opacity(0.05))
                            .cornerRadius(8)
                        }
                    }
                }
                .cardStyle()
            }
            .padding()
        }
        .background(AppTheme.background)
        .navigationTitle("Medication Reminders")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            medications = storage.load(forKey: StorageKey.medications, defaultValue: [])
        }
        .sheet(isPresented: $showAddSheet, onDismiss: {
            editingMedication = nil
        }) {
            MedicationFormSheet(
                medication: editingMedication,
                onSave: { med in
                    saveMedication(med)
                    showAddSheet = false
                }
            )
        }
    }

    // MARK: - Medication Card

    private func medicationCard(_ med: Medication) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "pills.fill")
                    .foregroundColor(AppTheme.primary)
                VStack(alignment: .leading) {
                    Text(med.name)
                        .font(.subheadline.bold())
                    Text(med.dosage)
                        .font(.caption)
                        .foregroundColor(AppTheme.textLight)
                }
                Spacer()
                Button {
                    deleteMedication(med)
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(AppTheme.avoid)
                }
            }

            HStack(spacing: 8) {
                ForEach(med.times, id: \.self) { time in
                    Text(time)
                        .font(.caption2.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.primary.opacity(0.1))
                        .foregroundColor(AppTheme.primary)
                        .cornerRadius(6)
                }

                if med.withFood {
                    Text("With food")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppTheme.caution.opacity(0.1))
                        .foregroundColor(AppTheme.caution)
                        .cornerRadius(6)
                }
            }

            if !med.notes.isEmpty {
                Text(med.notes)
                    .font(.caption2)
                    .foregroundColor(AppTheme.textLight)
                    .italic()
            }
        }
        .cardStyle()
    }

    // MARK: - Actions

    private func saveMedication(_ med: Medication) {
        if let index = medications.firstIndex(where: { $0.id == med.id }) {
            medications[index] = med
        } else {
            medications.append(med)
        }
        storage.save(medications, forKey: StorageKey.medications)
        NotificationManager.shared.scheduleMedicationReminder(medication: med)
    }

    private func deleteMedication(_ med: Medication) {
        NotificationManager.shared.cancelAllMedicationReminders(for: med)
        medications.removeAll { $0.id == med.id }
        storage.save(medications, forKey: StorageKey.medications)
    }
}

// MARK: - Medication Form Sheet

struct MedicationFormSheet: View {
    let medication: Medication?
    let onSave: (Medication) -> Void

    @State private var name = ""
    @State private var dosage = ""
    @State private var times = ["08:00"]
    @State private var notes = ""
    @State private var withFood = false

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Medication") {
                    TextField("Name", text: $name)
                    TextField("Dosage (e.g. 5mg)", text: $dosage)
                }

                Section("Reminder Times") {
                    ForEach(times.indices, id: \.self) { index in
                        HStack {
                            Text("Time \(index + 1)")
                            Spacer()
                            TextField("HH:MM", text: $times[index])
                                .multilineTextAlignment(.trailing)
                                .frame(width: 80)
                        }
                    }

                    if times.count < 4 {
                        Button {
                            times.append("12:00")
                        } label: {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Add Time")
                            }
                            .foregroundColor(AppTheme.primary)
                        }
                    }
                }

                Section("Options") {
                    Toggle("Take with food", isOn: $withFood)
                        .tint(AppTheme.primary)
                    TextField("Notes (optional)", text: $notes)
                }
            }
            .navigationTitle(medication == nil ? "Add Medication" : "Edit Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let med = Medication(
                            name: name,
                            dosage: dosage,
                            times: times,
                            notes: notes,
                            withFood: withFood
                        )
                        onSave(med)
                    }
                    .disabled(name.isEmpty)
                }
            }
            .onAppear {
                if let med = medication {
                    name = med.name
                    dosage = med.dosage
                    times = med.times
                    notes = med.notes
                    withFood = med.withFood
                }
            }
        }
    }
}
