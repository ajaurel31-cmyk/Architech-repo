'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPremiumActive } from '@/app/lib/storekit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisResult {
  foodName: string;
  description: string;
  purineLevel: 'low' | 'moderate' | 'high' | 'very_high';
  purineMgPerServing: number;
  riskAssessment: string;
  explanation: string;
  saferAlternatives: string[];
  safeDuringFlare: boolean;
  safeBetweenFlares: boolean;
  flareGuidance: string;
  servingSize: string;
}

interface DailyLogEntry {
  name: string;
  purineAmount: number;
  date: string;
  timestamp: number;
}

interface ScanHistoryEntry {
  foodName: string;
  purineLevel: string;
  purineMgPerServing: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCAN_COUNT_KEY = 'goutguard_scan_count';
const DAILY_LOG_KEY = 'goutguard_daily_log';
const SCAN_HISTORY_KEY = 'goutguard_scan_history';
const FREE_TIER_LIMIT = 3;
const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const PURINE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: '#d1fae5', text: '#065f46', label: 'Low' },
  moderate: { bg: '#fef3c7', text: '#92400e', label: 'Moderate' },
  high: { bg: '#ffedd5', text: '#9a3412', label: 'High' },
  very_high: { bg: '#fee2e2', text: '#991b1b', label: 'Very High' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getScanCount(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(SCAN_COUNT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === getTodayKey()) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { count: 0, date: getTodayKey() };
}

function incrementScanCount(): number {
  const current = getScanCount();
  const updated = { count: current.count + 1, date: getTodayKey() };
  try {
    localStorage.setItem(SCAN_COUNT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated.count;
}

function getRemainingScans(): number {
  if (isPremiumActive()) return Infinity;
  const { count } = getScanCount();
  return Math.max(0, FREE_TIER_LIMIT - count);
}

function canScan(): boolean {
  if (isPremiumActive()) return true;
  return getRemainingScans() > 0;
}

function addToDailyLog(entry: DailyLogEntry): void {
  try {
    const raw = localStorage.getItem(DAILY_LOG_KEY);
    const log: DailyLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch {
    // ignore
  }
}

function getScanHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(SCAN_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addToScanHistory(entry: ScanHistoryEntry): void {
  try {
    const history = getScanHistory();
    history.unshift(entry);
    const trimmed = history.slice(0, 20);
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WEBP.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum: 10MB.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<{ file: File; preview: string; base64: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingScans, setRemainingScans] = useState<number>(FREE_TIER_LIMIT);
  const [premium, setPremium] = useState(false);
  const [addedToLog, setAddedToLog] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize state from localStorage on mount
  useEffect(() => {
    setPremium(isPremiumActive());
    setRemainingScans(getRemainingScans());
    setScanHistory(getScanHistory().slice(0, 5));
  }, []);

  // Handle file selection
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const availableSlots = MAX_IMAGES - images.length;

      if (availableSlots <= 0) {
        setError(`Maximum ${MAX_IMAGES} images allowed.`);
        return;
      }

      const toProcess = fileArray.slice(0, availableSlots);
      const newImages: { file: File; preview: string; base64: string }[] = [];

      for (const file of toProcess) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        try {
          const base64 = await fileToBase64(file);
          const preview = URL.createObjectURL(file);
          newImages.push({ file, preview, base64 });
        } catch {
          setError('Failed to process image. Please try again.');
          return;
        }
      }

      setImages((prev) => [...prev, ...newImages]);
      setError(null);
      setResult(null);
      setAddedToLog(false);
    },
    [images.length],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [processFiles],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
    setResult(null);
    setAddedToLog(false);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  // Analyze images
  const handleAnalyze = useCallback(async () => {
    if (images.length === 0) return;

    if (!canScan()) {
      setError(
        'You have reached your daily scan limit. Upgrade to GoutGuard Premium for unlimited scans.',
      );
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setAddedToLog(false);

    try {
      const base64Strings = images.map((img) => img.base64);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Strings }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Analysis failed with status ${response.status}`,
        );
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      // Track scan usage
      incrementScanCount();
      setRemainingScans(getRemainingScans());

      // Add to scan history
      const historyEntry: ScanHistoryEntry = {
        foodName: data.foodName,
        purineLevel: data.purineLevel,
        purineMgPerServing: data.purineMgPerServing,
        timestamp: Date.now(),
      };
      addToScanHistory(historyEntry);
      setScanHistory(getScanHistory().slice(0, 5));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [images]);

  // Add result to daily log
  const handleAddToLog = useCallback(() => {
    if (!result) return;

    const entry: DailyLogEntry = {
      name: result.foodName,
      purineAmount: result.purineMgPerServing,
      date: getTodayKey(),
      timestamp: Date.now(),
    };

    addToDailyLog(entry);
    setAddedToLog(true);
  }, [result]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeStyle = result ? PURINE_BADGE_STYLES[result.purineLevel] : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: '#1a56db',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <button
          onClick={() => router.push('/')}
          aria-label="Go back"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Scan Food</h1>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: '20px',
          paddingBottom: '100px',
          maxWidth: '600px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Free tier limit display */}
        {!premium && (
          <div
            style={{
              backgroundColor: remainingScans > 0 ? '#eff6ff' : '#fef2f2',
              border: `1px solid ${remainingScans > 0 ? '#bfdbfe' : '#fecaca'}`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                color: remainingScans > 0 ? '#1e40af' : '#991b1b',
                fontWeight: 500,
              }}
            >
              {remainingScans > 0
                ? `${remainingScans}/${FREE_TIER_LIMIT} scans remaining today`
                : 'Daily scan limit reached'}
            </span>
            {remainingScans === 0 && (
              <button
                onClick={() => router.push('/settings')}
                style={{
                  background: '#1a56db',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Upgrade
              </button>
            )}
          </div>
        )}

        {/* ── Upload Zone ───────────────────────────────────────────────────── */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (images.length < MAX_IMAGES) {
              fileInputRef.current?.click();
            }
          }}
          style={{
            border: `2px dashed ${isDragging ? '#1a56db' : '#cbd5e1'}`,
            borderRadius: '16px',
            padding: images.length > 0 ? '16px' : '40px 20px',
            textAlign: 'center',
            cursor: images.length < MAX_IMAGES ? 'pointer' : 'default',
            backgroundColor: isDragging ? '#eff6ff' : '#ffffff',
            transition: 'all 0.2s ease',
            marginBottom: '16px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {images.length === 0 ? (
            <div>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1e293b',
                  margin: '0 0 6px',
                }}
              >
                Tap to take a photo or upload
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  margin: '0 0 4px',
                }}
              >
                Drag and drop images here, or tap to browse
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: 0,
                }}
              >
                JPEG, PNG, GIF, WEBP - Max 10MB each - Up to {MAX_IMAGES} images
              </p>
            </div>
          ) : (
            <div>
              {/* Preview Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: images.length < MAX_IMAGES ? '12px' : '0',
                }}
              >
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      backgroundColor: '#f1f5f9',
                    }}
                  >
                    <img
                      src={img.preview}
                      alt={`Uploaded food image ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      aria-label={`Remove image ${idx + 1}`}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {images.length < MAX_IMAGES && (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: 0,
                  }}
                >
                  Tap to add more ({images.length}/{MAX_IMAGES})
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Error Display ─────────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p style={{ fontSize: '14px', color: '#991b1b', margin: 0, lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* ── Analyze Button ────────────────────────────────────────────────── */}
        <button
          onClick={handleAnalyze}
          disabled={images.length === 0 || isAnalyzing}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            backgroundColor:
              images.length === 0 || isAnalyzing ? '#94a3b8' : '#1a56db',
            color: '#ffffff',
            fontSize: '17px',
            fontWeight: 700,
            cursor: images.length === 0 || isAnalyzing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '24px',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isAnalyzing ? (
            <>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: 'goutguard-spin 1s linear infinite',
                }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Analyze for Purines
            </>
          )}
        </button>

        {/* Spinner keyframe animation */}
        <style>{`
          @keyframes goutguard-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* ── Results Display ───────────────────────────────────────────────── */}
        {result && badgeStyle && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)',
              marginBottom: '24px',
            }}
          >
            {/* Food Name and Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 6px',
                  }}
                >
                  {result.foodName}
                </h2>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#64748b',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {result.description}
                </p>
              </div>
              <span
                style={{
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.text,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {badgeStyle.label}
              </span>
            </div>

            {/* Purine Content */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: '0 0 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                  }}
                >
                  Estimated Purine Content
                </p>
                <p
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {result.purineMgPerServing}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>
                    mg / {result.servingSize || 'serving'}
                  </span>
                </p>
              </div>
            </div>

            {/* Risk Assessment */}
            <div style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Risk Assessment
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#334155',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {result.riskAssessment}
              </p>
            </div>

            {/* Explanation */}
            <div style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Why This Matters for Gout
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#334155',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {result.explanation}
              </p>
            </div>

            {/* Flare Guidance */}
            <div
              style={{
                backgroundColor: result.safeDuringFlare ? '#f0fdf4' : '#fef2f2',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: result.safeDuringFlare ? '#16a34a' : '#dc2626',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    During flare: {result.safeDuringFlare ? 'Generally safe' : 'Avoid'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: result.safeBetweenFlares ? '#16a34a' : '#dc2626',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Between flares: {result.safeBetweenFlares ? 'Generally safe' : 'Limit intake'}
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {result.flareGuidance}
              </p>
            </div>

            {/* Safer Alternatives */}
            {result.saferAlternatives && result.saferAlternatives.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 10px',
                  }}
                >
                  Safer Alternatives
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.saferAlternatives.map((alt, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Daily Log Button */}
            <button
              onClick={handleAddToLog}
              disabled={addedToLog}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: addedToLog ? '2px solid #16a34a' : '2px solid #1a56db',
                backgroundColor: addedToLog ? '#f0fdf4' : '#ffffff',
                color: addedToLog ? '#16a34a' : '#1a56db',
                fontSize: '15px',
                fontWeight: 700,
                cursor: addedToLog ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              {addedToLog ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Added to Daily Log
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to Daily Log
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Scan History ──────────────────────────────────────────────────── */}
        {scanHistory.length > 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 14px',
              }}
            >
              Recent Scans
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scanHistory.map((entry, idx) => {
                const entryBadge = PURINE_BADGE_STYLES[entry.purineLevel] || PURINE_BADGE_STYLES.low;
                const scanDate = new Date(entry.timestamp);
                const timeStr = scanDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = scanDate.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#1e293b',
                          margin: '0 0 2px',
                        }}
                      >
                        {entry.foodName}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          margin: 0,
                        }}
                      >
                        {dateStr} at {timeStr}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        {entry.purineMgPerServing} mg
                      </span>
                      <span
                        style={{
                          backgroundColor: entryBadge.bg,
                          color: entryBadge.text,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {entryBadge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation ───────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          zIndex: 50,
        }}
      >
        {/* Home */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            color: '#94a3b8',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 500 }}>Home</span>
        </button>

        {/* Scan (Active) */}
        <button
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            color: '#1a56db',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 700 }}>Scan</span>
        </button>

        {/* Meals */}
        <button
          onClick={() => router.push('/meals')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            color: '#94a3b8',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 500 }}>Meals</span>
        </button>

        {/* Flares */}
        <button
          onClick={() => router.push('/flares')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            color: '#94a3b8',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 500 }}>Flares</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push('/settings')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 12px',
            color: '#94a3b8',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 500 }}>Settings</span>
        </button>
      </nav>
    </div>
  );
}
