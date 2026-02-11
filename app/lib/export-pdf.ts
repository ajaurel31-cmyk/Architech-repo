/**
 * PDF Export for GoutGuard - generates a printable health report.
 *
 * Uses a new browser window with print-optimized HTML that the user can
 * save/print as PDF via the native share sheet or browser print dialog.
 */

// ---------------------------------------------------------------------------
// Types (matching localStorage shapes)
// ---------------------------------------------------------------------------

interface FoodLogEntry {
  food: string;
  purineAmount: number;
  date: string;
}

interface UricAcidReading {
  id: string;
  date: string;
  value: number;
  notes: string;
  timestamp: number;
}

interface FlareEntry {
  id: string;
  date: string;
  joints: string[];
  painLevel: number;
  duration: number;
  durationUnit: 'hours' | 'days';
  triggers: string[];
  treatments: string[];
  notes: string;
  timestamp: number;
}

interface WaterLogEntry {
  amount: number;
  date: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  withFood: boolean;
  notes: string;
}

interface GoutGuardSettings {
  goutStage: string;
  dietaryRestrictions: string[];
  purineTarget: number;
  waterGoal: { amount: number; unit: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function uricAcidStatus(value: number): string {
  if (value < 6.0) return 'In Target';
  if (value <= 7.0) return 'Borderline';
  if (value <= 9.0) return 'Elevated';
  return 'High';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export function generateHealthReport(): void {
  const settings = safeLoad<GoutGuardSettings>('goutguard_settings', {
    goutStage: 'Not specified',
    dietaryRestrictions: [],
    purineTarget: 400,
    waterGoal: { amount: 64, unit: 'oz' },
  });
  const readings = safeLoad<UricAcidReading[]>('goutguard_uric_acid_readings', []);
  const flares = safeLoad<FlareEntry[]>('goutguard_flares', []);
  const foodLog = safeLoad<FoodLogEntry[]>('goutguard_daily_log', []);
  const waterLog = safeLoad<WaterLogEntry[]>('goutguard_water_log', []);
  const medications = safeLoad<Medication[]>('goutguard_medications', []);

  const sortedReadings = [...readings].sort((a, b) => b.timestamp - a.timestamp);
  const sortedFlares = [...flares].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const recentFoodLog = [...foodLog]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Uric acid stats
  let uaStats = '';
  if (sortedReadings.length > 0) {
    const values = sortedReadings.map((r) => r.value);
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    const high = Math.max(...values).toFixed(1);
    const low = Math.min(...values).toFixed(1);
    const inTarget = values.filter((v) => v < 6.0).length;
    uaStats = `
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-num">${avg}</div><div class="stat-label">Average (mg/dL)</div></div>
        <div class="stat-box"><div class="stat-num">${high}</div><div class="stat-label">Highest</div></div>
        <div class="stat-box"><div class="stat-num">${low}</div><div class="stat-label">Lowest</div></div>
        <div class="stat-box"><div class="stat-num">${inTarget}/${values.length}</div><div class="stat-label">In Target (&lt;6.0)</div></div>
      </div>
    `;
  }

  // Flare stats
  let flareStats = '';
  if (sortedFlares.length > 0) {
    const avgPain = (
      sortedFlares.reduce((sum, f) => sum + f.painLevel, 0) / sortedFlares.length
    ).toFixed(1);
    const jointCounts: Record<string, number> = {};
    sortedFlares.forEach((f) =>
      f.joints.forEach((j) => (jointCounts[j] = (jointCounts[j] || 0) + 1)),
    );
    const topJoint =
      Object.entries(jointCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const triggerCounts: Record<string, number> = {};
    sortedFlares.forEach((f) =>
      f.triggers.forEach((t) => (triggerCounts[t] = (triggerCounts[t] || 0) + 1)),
    );
    const topTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    flareStats = `
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-num">${sortedFlares.length}</div><div class="stat-label">Total Flares</div></div>
        <div class="stat-box"><div class="stat-num">${avgPain}/10</div><div class="stat-label">Avg Pain Level</div></div>
        <div class="stat-box"><div class="stat-num">${escapeHtml(topJoint)}</div><div class="stat-label">Most Affected Joint</div></div>
        <div class="stat-box"><div class="stat-num">${topTriggers.length > 0 ? topTriggers.map(escapeHtml).join(', ') : 'N/A'}</div><div class="stat-label">Top Triggers</div></div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GoutGuard Health Report - ${reportDate}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .section { page-break-inside: avoid; }
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1a56db;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 28px; color: #1a56db; margin-bottom: 4px; }
    .header p { color: #64748b; font-size: 14px; }
    .print-btn {
      display: block;
      margin: 0 auto 24px;
      padding: 12px 32px;
      background: #1a56db;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { background: #1e40af; }
    .section { margin-bottom: 28px; }
    .section h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 14px; }
    .profile-grid dt { font-weight: 600; color: #475569; }
    .profile-grid dd { color: #1e293b; margin-bottom: 4px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .stat-num { font-size: 20px; font-weight: 700; color: #1a56db; }
    .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      text-align: left;
      padding: 8px 10px;
      background: #f1f5f9;
      border-bottom: 2px solid #e2e8f0;
      font-weight: 600;
      color: #475569;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .empty-msg { color: #94a3b8; font-style: italic; font-size: 14px; padding: 12px 0; }
    .disclaimer {
      margin-top: 32px;
      padding: 16px;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
      text-align: center;
    }
    .med-item { margin-bottom: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .med-name { font-weight: 700; font-size: 15px; }
    .med-detail { font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>GoutGuard Health Report</h1>
    <p>Generated on ${reportDate}</p>
  </div>

  <button class="print-btn no-print" onclick="window.print()">
    Print / Save as PDF
  </button>

  <!-- Profile -->
  <div class="section">
    <h2>Patient Profile</h2>
    <dl class="profile-grid">
      <dt>Gout Stage</dt>
      <dd>${escapeHtml(settings.goutStage)}</dd>
      <dt>Dietary Restrictions</dt>
      <dd>${settings.dietaryRestrictions.length > 0 ? settings.dietaryRestrictions.map(escapeHtml).join(', ') : 'None'}</dd>
      <dt>Daily Purine Target</dt>
      <dd>${settings.purineTarget}mg</dd>
      <dt>Water Intake Goal</dt>
      <dd>${settings.waterGoal.amount} ${escapeHtml(settings.waterGoal.unit)}</dd>
    </dl>
  </div>

  <!-- Medications -->
  <div class="section">
    <h2>Current Medications (${medications.length})</h2>
    ${
      medications.length === 0
        ? '<p class="empty-msg">No medications recorded.</p>'
        : medications
            .map(
              (m) => `
        <div class="med-item">
          <div class="med-name">${escapeHtml(m.name)}</div>
          <div class="med-detail">Dosage: ${escapeHtml(m.dosage)} | Times: ${m.times.length > 0 ? m.times.join(', ') : 'Not set'}${m.withFood ? ' | Take with food' : ''}</div>
          ${m.notes ? `<div class="med-detail" style="margin-top:4px;font-style:italic">Notes: ${escapeHtml(m.notes)}</div>` : ''}
        </div>`,
            )
            .join('')
    }
  </div>

  <!-- Uric Acid -->
  <div class="section">
    <h2>Uric Acid Readings (${sortedReadings.length})</h2>
    ${uaStats}
    ${
      sortedReadings.length === 0
        ? '<p class="empty-msg">No uric acid readings recorded.</p>'
        : `<table>
        <thead><tr><th>Date</th><th>Value (mg/dL)</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${sortedReadings
            .slice(0, 50)
            .map(
              (r) =>
                `<tr><td>${formatDate(r.date)}</td><td>${r.value.toFixed(1)}</td><td>${uricAcidStatus(r.value)}</td><td>${r.notes ? escapeHtml(r.notes) : '-'}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
      ${sortedReadings.length > 50 ? `<p class="empty-msg">Showing most recent 50 of ${sortedReadings.length} readings.</p>` : ''}`
    }
  </div>

  <!-- Flare History -->
  <div class="section">
    <h2>Gout Flare History (${sortedFlares.length})</h2>
    ${flareStats}
    ${
      sortedFlares.length === 0
        ? '<p class="empty-msg">No flare events recorded.</p>'
        : `<table>
        <thead><tr><th>Date</th><th>Joints</th><th>Pain</th><th>Duration</th><th>Triggers</th><th>Treatments</th></tr></thead>
        <tbody>
          ${sortedFlares
            .slice(0, 50)
            .map(
              (f) =>
                `<tr><td>${formatDate(f.date)}</td><td>${f.joints.map(escapeHtml).join(', ')}</td><td>${f.painLevel}/10</td><td>${f.duration} ${f.durationUnit}</td><td>${f.triggers.length > 0 ? f.triggers.map(escapeHtml).join(', ') : '-'}</td><td>${f.treatments.length > 0 ? f.treatments.map(escapeHtml).join(', ') : '-'}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>`
    }
  </div>

  <!-- Recent Food Log -->
  <div class="section">
    <h2>Recent Food Log (${foodLog.length} total entries)</h2>
    ${
      recentFoodLog.length === 0
        ? '<p class="empty-msg">No food items logged.</p>'
        : `<table>
        <thead><tr><th>Date</th><th>Food</th><th>Purine (mg)</th></tr></thead>
        <tbody>
          ${recentFoodLog
            .map(
              (f) =>
                `<tr><td>${formatDate(f.date)}</td><td>${escapeHtml(f.food)}</td><td>${f.purineAmount}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
      ${foodLog.length > 50 ? `<p class="empty-msg">Showing most recent 50 of ${foodLog.length} entries.</p>` : ''}`
    }
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    <strong>Medical Disclaimer:</strong> This report is generated from self-reported data tracked in the GoutGuard app.
    It is intended for informational purposes only and does not constitute medical advice. Always consult your
    healthcare provider for diagnosis, treatment, and management of gout and related conditions.
  </div>
</body>
</html>`;

  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write(html);
    reportWindow.document.close();
  } else {
    // Fallback: download as HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GoutGuard-Report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
