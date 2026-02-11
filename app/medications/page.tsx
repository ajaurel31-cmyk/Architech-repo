'use client';

import { useState, useEffect, useCallback } from 'react';

// --- Types ---

interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  withFood: boolean;
  notes: string;
}

interface DoseLogEntry {
  medicationId: string;
  time: string;
  date: string;
  takenAt: string;
}

// --- Constants ---

const COMMON_MEDICATIONS = [
  'Allopurinol',
  'Febuxostat (Uloric)',
  'Colchicine',
  'Indomethacin',
  'Naproxen',
  'Ibuprofen',
  'Prednisone',
  'Probenecid',
  'Pegloticase',
  'Custom',
];

const NSAIDS = ['Indomethacin', 'Naproxen', 'Ibuprofen'];

const STORAGE_KEY_MEDICATIONS = 'goutguard_medications';
const STORAGE_KEY_DOSE_LOG = 'goutguard_dose_log';

// --- Helpers ---

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${ampm}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// --- Drug Interaction Logic ---

interface InteractionWarning {
  message: string;
}

function detectInteractions(medications: Medication[]): InteractionWarning[] {
  const warnings: InteractionWarning[] = [];
  const names = medications.map((m) => m.name.toLowerCase());

  const hasColchicine = names.some((n) => n.includes('colchicine'));
  const hasAllopurinol = names.some((n) => n.includes('allopurinol'));
  const hasNSAID = medications.some((m) =>
    NSAIDS.some((nsaid) => m.name.toLowerCase().includes(nsaid.toLowerCase()))
  );

  if (hasColchicine) {
    warnings.push({
      message:
        'Avoid alcohol with colchicine — increases risk of liver damage and side effects',
    });
  }

  if (hasAllopurinol) {
    warnings.push({
      message:
        'Allopurinol can increase azathioprine levels — discuss with your doctor',
    });
  }

  if (hasNSAID) {
    warnings.push({
      message:
        'NSAIDs may increase bleeding risk with anticoagulants',
    });
  }

  return warnings;
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 90,
  },
  header: {
    background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
    color: '#fff',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  },
  backButton: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    borderRadius: 8,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '16px 16px 0',
  },
  addButton: {
    width: '100%',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  warningBanner: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningIcon: {
    fontSize: 20,
    flexShrink: 0,
    marginTop: 1,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 1.5,
    margin: 0,
  },
  warningsSection: {
    marginBottom: 16,
  },
  warningsSectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  medDosage: {
    fontSize: 14,
    color: '#64748b',
    margin: '4px 0 0',
  },
  cardActions: {
    display: 'flex',
    gap: 6,
  },
  iconBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
    color: '#64748b',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid #fecaca',
    borderRadius: 8,
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
    color: '#ef4444',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 13,
    color: '#475569',
  },
  foodBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef9c3',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 13,
    color: '#854d0e',
  },
  notesText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    margin: '0 0 12px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeft: '3px solid #cbd5e1',
  },
  doseSection: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: 12,
  },
  doseSectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  doseRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f8fafc',
  },
  doseTime: {
    fontSize: 15,
    fontWeight: 600,
    color: '#334155',
  },
  takeBtn: {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  takeBtnTaken: {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1px solid #22c55e',
    backgroundColor: '#22c55e',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'default',
  },
  takenTimestamp: {
    fontSize: 11,
    color: '#16a34a',
    marginTop: 2,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 20px',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 1.6,
    maxWidth: 360,
    margin: '0 auto 24px',
  },
  emptyMedList: {
    textAlign: 'left' as const,
    maxWidth: 340,
    margin: '0 auto',
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  emptyMedListTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 8,
  },
  emptyMedItem: {
    fontSize: 14,
    color: '#64748b',
    padding: '3px 0',
  },

  // Modal
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    padding: '24px 20px 32px',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#fff',
    appearance: 'none' as const,
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 15,
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 15,
    color: '#1e293b',
    minHeight: 80,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  timesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addTimeBtn: {
    background: 'none',
    border: '1px solid #1a56db',
    color: '#1a56db',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 15,
    outline: 'none',
  },
  removeTimeBtn: {
    background: 'none',
    border: '1px solid #fecaca',
    color: '#ef4444',
    borderRadius: 8,
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 18,
    flexShrink: 0,
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  toggleLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: 500,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background-color 0.2s',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute' as const,
    top: 3,
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  saveBtn: {
    width: '100%',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #1a56db 0%, #1e40af 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  cancelBtn: {
    width: '100%',
    padding: '12px 20px',
    background: 'none',
    color: '#64748b',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 8,
  },

  // Bottom nav
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '8px 0',
    paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
    zIndex: 40,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textDecoration: 'none',
    fontSize: 11,
    color: '#94a3b8',
    gap: 2,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '4px 8px',
  },
  navIcon: {
    fontSize: 22,
  },
};

// --- Component ---

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseLog, setDoseLog] = useState<DoseLogEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formMedSelect, setFormMedSelect] = useState('');
  const [formCustomName, setFormCustomName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formTimes, setFormTimes] = useState<string[]>(['08:00']);
  const [formWithFood, setFormWithFood] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  const today = getTodayDateString();

  // Load data from localStorage
  useEffect(() => {
    setMedications(loadFromStorage<Medication[]>(STORAGE_KEY_MEDICATIONS, []));
    setDoseLog(loadFromStorage<DoseLogEntry[]>(STORAGE_KEY_DOSE_LOG, []));
  }, []);

  // Save medications
  const saveMedications = useCallback(
    (meds: Medication[]) => {
      setMedications(meds);
      saveToStorage(STORAGE_KEY_MEDICATIONS, meds);
    },
    []
  );

  // Save dose log
  const saveDoseLog = useCallback(
    (log: DoseLogEntry[]) => {
      setDoseLog(log);
      saveToStorage(STORAGE_KEY_DOSE_LOG, log);
    },
    []
  );

  // Interaction warnings
  const interactionWarnings = detectInteractions(medications);

  // Reset form
  function resetForm() {
    setFormMedSelect('');
    setFormCustomName('');
    setFormDosage('');
    setFormTimes(['08:00']);
    setFormWithFood(false);
    setFormNotes('');
    setEditingId(null);
  }

  // Open add modal
  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  // Open edit modal
  function openEditModal(med: Medication) {
    const isCommon = COMMON_MEDICATIONS.some(
      (cm) => cm.toLowerCase() === med.name.toLowerCase()
    );
    setFormMedSelect(isCommon ? med.name : 'Custom');
    setFormCustomName(isCommon ? '' : med.name);
    setFormDosage(med.dosage);
    setFormTimes(med.times.length > 0 ? [...med.times] : ['08:00']);
    setFormWithFood(med.withFood);
    setFormNotes(med.notes);
    setEditingId(med.id);
    setShowModal(true);
  }

  // Save medication (add or edit)
  function handleSave() {
    const name =
      formMedSelect === 'Custom' ? formCustomName.trim() : formMedSelect;
    if (!name) return;
    if (!formDosage.trim()) return;

    const validTimes = formTimes.filter((t) => t.trim() !== '');

    if (editingId) {
      const updated = medications.map((m) =>
        m.id === editingId
          ? {
              ...m,
              name,
              dosage: formDosage.trim(),
              times: validTimes,
              withFood: formWithFood,
              notes: formNotes.trim(),
            }
          : m
      );
      saveMedications(updated);
    } else {
      const newMed: Medication = {
        id: generateId(),
        name,
        dosage: formDosage.trim(),
        times: validTimes,
        withFood: formWithFood,
        notes: formNotes.trim(),
      };
      saveMedications([...medications, newMed]);
    }

    setShowModal(false);
    resetForm();
  }

  // Delete medication
  function handleDelete(id: string) {
    if (!confirm('Delete this medication?')) return;
    saveMedications(medications.filter((m) => m.id !== id));
    // Also clean up dose log entries for this medication
    saveDoseLog(doseLog.filter((d) => d.medicationId !== id));
  }

  // Take dose
  function handleTakeDose(medicationId: string, time: string) {
    const entry: DoseLogEntry = {
      medicationId,
      time,
      date: today,
      takenAt: new Date().toISOString(),
    };
    saveDoseLog([...doseLog, entry]);
  }

  // Check if dose taken
  function isDoseTaken(
    medicationId: string,
    time: string
  ): DoseLogEntry | undefined {
    return doseLog.find(
      (d) => d.medicationId === medicationId && d.time === time && d.date === today
    );
  }

  // Form time management
  function addTime() {
    setFormTimes([...formTimes, '12:00']);
  }

  function removeTime(index: number) {
    if (formTimes.length <= 1) return;
    setFormTimes(formTimes.filter((_, i) => i !== index));
  }

  function updateTime(index: number, value: string) {
    const updated = [...formTimes];
    updated[index] = value;
    setFormTimes(updated);
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => {
            if (typeof window !== 'undefined') window.history.back();
          }}
          aria-label="Go back"
        >
          &#8592;
        </button>
        <h1 style={styles.headerTitle}>Medications</h1>
      </header>

      <div style={styles.container}>
        {/* Add Medication Button */}
        <button style={styles.addButton} onClick={openAddModal}>
          <span style={{ fontSize: 20 }}>+</span> Add Medication
        </button>

        {/* Drug Interaction Warnings */}
        {interactionWarnings.length > 0 && (
          <div style={styles.warningsSection}>
            <div style={styles.warningsSectionTitle}>
              Drug Interaction Warnings
            </div>
            {interactionWarnings.map((w, i) => (
              <div key={i} style={styles.warningBanner}>
                <span style={styles.warningIcon}>&#9888;</span>
                <p style={styles.warningText}>{w.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Medication List */}
        {medications.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>&#128138;</div>
            <div style={styles.emptyTitle}>No Medications Added</div>
            <p style={styles.emptyText}>
              Track your gout medications and set reminders to stay on schedule.
              Tap the button above to add your first medication.
            </p>
            <div style={styles.emptyMedList}>
              <div style={styles.emptyMedListTitle}>
                Common gout medications include:
              </div>
              <div style={styles.emptyMedItem}>
                &#8226; Allopurinol &mdash; lowers uric acid production
              </div>
              <div style={styles.emptyMedItem}>
                &#8226; Febuxostat (Uloric) &mdash; lowers uric acid production
              </div>
              <div style={styles.emptyMedItem}>
                &#8226; Colchicine &mdash; reduces gout flare inflammation
              </div>
              <div style={styles.emptyMedItem}>
                &#8226; Indomethacin &mdash; NSAID for acute flares
              </div>
              <div style={styles.emptyMedItem}>
                &#8226; Prednisone &mdash; corticosteroid for inflammation
              </div>
              <div style={styles.emptyMedItem}>
                &#8226; Probenecid &mdash; increases uric acid excretion
              </div>
            </div>
          </div>
        ) : (
          medications.map((med) => (
            <div key={med.id} style={styles.card}>
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.medName}>{med.name}</h3>
                  <p style={styles.medDosage}>{med.dosage}</p>
                </div>
                <div style={styles.cardActions}>
                  <button
                    style={styles.iconBtn}
                    onClick={() => openEditModal(med)}
                    aria-label="Edit medication"
                    title="Edit"
                  >
                    &#9998;
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(med.id)}
                    aria-label="Delete medication"
                    title="Delete"
                  >
                    &#128465;
                  </button>
                </div>
              </div>

              {/* Meta badges */}
              <div style={styles.metaRow}>
                {med.times.map((t, i) => (
                  <span key={i} style={styles.metaBadge}>
                    &#128336; {formatTime12h(t)}
                  </span>
                ))}
                {med.withFood && (
                  <span style={styles.foodBadge}>&#127860; Take with food</span>
                )}
              </div>

              {/* Notes */}
              {med.notes && <p style={styles.notesText}>{med.notes}</p>}

              {/* Dose Tracker */}
              {med.times.length > 0 && (
                <div style={styles.doseSection}>
                  <div style={styles.doseSectionTitle}>
                    Today&apos;s Doses
                  </div>
                  {med.times.map((time, i) => {
                    const takenEntry = isDoseTaken(med.id, time);
                    return (
                      <div key={i} style={styles.doseRow}>
                        <div>
                          <div style={styles.doseTime}>
                            {formatTime12h(time)}
                          </div>
                          {takenEntry && (
                            <div style={styles.takenTimestamp}>
                              Taken at{' '}
                              {new Date(takenEntry.takenAt).toLocaleTimeString(
                                [],
                                { hour: 'numeric', minute: '2-digit' }
                              )}
                            </div>
                          )}
                        </div>
                        {takenEntry ? (
                          <button style={styles.takeBtnTaken} disabled>
                            &#10003; Taken
                          </button>
                        ) : (
                          <button
                            style={styles.takeBtn}
                            onClick={() => handleTakeDose(med.id, time)}
                          >
                            Take
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          style={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              resetForm();
            }
          }}
        >
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              {editingId ? 'Edit Medication' : 'Add Medication'}
            </h2>

            {/* Medication Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Medication Name</label>
              <select
                style={styles.select}
                value={formMedSelect}
                onChange={(e) => {
                  setFormMedSelect(e.target.value);
                  if (e.target.value !== 'Custom') {
                    setFormCustomName('');
                  }
                }}
              >
                <option value="" disabled>
                  Select a medication...
                </option>
                {COMMON_MEDICATIONS.map((med) => (
                  <option key={med} value={med}>
                    {med}
                  </option>
                ))}
              </select>
              {formMedSelect === 'Custom' && (
                <input
                  style={{ ...styles.input, marginTop: 8 }}
                  type="text"
                  placeholder="Enter medication name"
                  value={formCustomName}
                  onChange={(e) => setFormCustomName(e.target.value)}
                />
              )}
            </div>

            {/* Dosage */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Dosage</label>
              <input
                style={styles.input}
                type="text"
                placeholder='e.g., "100mg", "0.6mg twice daily"'
                value={formDosage}
                onChange={(e) => setFormDosage(e.target.value)}
              />
            </div>

            {/* Reminder Times */}
            <div style={styles.formGroup}>
              <div style={styles.timesHeader}>
                <label style={styles.label}>Reminder Times</label>
                <button style={styles.addTimeBtn} onClick={addTime}>
                  + Add Time
                </button>
              </div>
              {formTimes.map((t, i) => (
                <div key={i} style={styles.timeRow}>
                  <input
                    style={styles.timeInput}
                    type="time"
                    value={t}
                    onChange={(e) => updateTime(i, e.target.value)}
                  />
                  {formTimes.length > 1 && (
                    <button
                      style={styles.removeTimeBtn}
                      onClick={() => removeTime(i)}
                      aria-label="Remove time"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Take with Food Toggle */}
            <div style={styles.formGroup}>
              <div style={styles.toggleRow}>
                <span style={styles.toggleLabel}>Take with food</span>
                <button
                  style={{
                    ...styles.toggle,
                    backgroundColor: formWithFood ? '#22c55e' : '#d1d5db',
                  }}
                  onClick={() => setFormWithFood(!formWithFood)}
                  aria-label="Toggle take with food"
                  type="button"
                >
                  <div
                    style={{
                      ...styles.toggleKnob,
                      left: formWithFood ? 23 : 3,
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                placeholder='e.g., "Avoid alcohol while taking"'
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {/* Save / Cancel */}
            <button style={styles.saveBtn} onClick={handleSave}>
              {editingId ? 'Save Changes' : 'Save Medication'}
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <a href="/" style={styles.navItem}>
          <span style={styles.navIcon}>&#127968;</span>
          <span>Home</span>
        </a>
        <a href="/scan" style={styles.navItem}>
          <span style={styles.navIcon}>&#128247;</span>
          <span>Scan</span>
        </a>
        <a href="/database" style={styles.navItem}>
          <span style={styles.navIcon}>&#128218;</span>
          <span>Database</span>
        </a>
        <a href="/uric-acid" style={styles.navItem}>
          <span style={styles.navIcon}>&#128200;</span>
          <span>Track</span>
        </a>
        <a href="/settings" style={styles.navItem}>
          <span style={styles.navIcon}>&#9881;</span>
          <span>Settings</span>
        </a>
      </nav>
    </div>
  );
}
