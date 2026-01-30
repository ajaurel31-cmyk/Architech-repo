'use client'

import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'

interface AnalysisResult {
  verdict: 'safe' | 'caution' | 'avoid'
  summary: string
  analysis: string
}

interface ImageFile {
  id: string
  data: string
  name: string
}

export default function Home() {
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service worker registration failed:', err)
      })
    }
  }, [])

  const [images, setImages] = useState<ImageFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (images.length >= 4) {
      setError('Maximum 4 images allowed')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const newImage: ImageFile = {
        id: Date.now().toString(),
        data: e.target?.result as string,
        name: file.name
      }
      setImages(prev => [...prev, newImage])
      setResult(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => handleFile(file))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleAnalyze = async () => {
    if (images.length === 0) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: images.map(img => img.data) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
    setResult(null)
  }

  const clearAllImages = () => {
    setImages([])
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <main className="container">
      {/* Medical Disclaimer Banner */}
      <div className="disclaimer-banner">
        <strong>Medical Disclaimer:</strong> This app is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your transplant care team before making any dietary changes. <Link href="/disclaimer">Read full disclaimer</Link>
      </div>

      <header className="header">
        <h1>Post-Kidney Transplant Nutrition Guide</h1>
        <p>Upload nutrition facts to check if they&apos;re safe for post-kidney transplant patients</p>
      </header>

      <div className="card">
        <div className="upload-section">
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
            <h3>Upload Nutrition Facts</h3>
            <p>Upload multiple images (nutrition facts + ingredients list)</p>
            <p className="upload-hint">Up to 4 images allowed</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={handleFileSelect}
              multiple
            />
          </div>

          {images.length > 0 && (
            <div className="preview-section">
              <div className="preview-grid">
                {images.map((img) => (
                  <div key={img.id} className="preview-item">
                    <img src={img.data} alt={img.name} className="preview-image-small" />
                    <button
                      className="remove-image-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(img.id)
                      }}
                      aria-label="Remove image"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
                {images.length < 4 && (
                  <div
                    className="add-more-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    <span>Add More</span>
                  </div>
                )}
              </div>
              <p className="image-count">{images.length} image{images.length !== 1 ? 's' : ''} selected</p>
              <button className="clear-btn" onClick={clearAllImages}>
                Clear All
              </button>
            </div>
          )}
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={images.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <span className="loading">
              <span className="spinner"></span>
              Analyzing...
            </span>
          ) : (
            'Check Food Safety'
          )}
        </button>

        {error && <div className="error-message">{error}</div>}

        {result && (
          <div className="results-section">
            <div className="results-header">
              <span className={`verdict-icon ${result.verdict}`}>
                {result.verdict === 'safe' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                )}
                {result.verdict === 'caution' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )}
                {result.verdict === 'avoid' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                )}
              </span>
              <h2>Analysis Results</h2>
            </div>

            <div className={`verdict ${result.verdict}`}>
              <h3>
                {result.verdict === 'safe' && 'Generally Safe for Post-Transplant Patients'}
                {result.verdict === 'caution' && 'Use Caution - Check with Your Care Team'}
                {result.verdict === 'avoid' && 'Best to Avoid After Transplant'}
              </h3>
              <p>{result.summary}</p>
            </div>

            <div className="analysis-content">
              <SafeAnalysisContent text={result.analysis} />
            </div>
          </div>
        )}
      </div>

      <div className="feature-links">
        <Link href="/meals" className="feature-link">
          <div className="feature-promo">
            <span className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                <path d="M7 2v20"/>
                <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
            </span>
            <div>
              <h3>Meal Recommendations</h3>
              <p>Get post-kidney transplant-safe meal ideas for breakfast, lunch, dinner, and snacks</p>
            </div>
            <span className="arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </div>
        </Link>

        <Link href="/medications" className="feature-link">
          <div className="feature-promo">
            <span className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                <path d="m8.5 8.5 7 7"/>
              </svg>
            </span>
            <div>
              <h3>Medication Reminders</h3>
              <p>Never miss your immunosuppressants with smart reminders</p>
            </div>
            <span className="arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </div>
        </Link>
      </div>

      {/* Footer with legal links */}
      <footer className="app-footer">
        <p className="copyright">&copy; {new Date().getFullYear()} TransplantFood. All rights reserved.</p>
      </footer>
    </main>
  )
}

// Safe text rendering component - no dangerouslySetInnerHTML to prevent XSS
function SafeAnalysisContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let key = 0

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key++}>
          {currentList.map((item, i) => (
            <li key={i}>{formatInlineText(item)}</li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      continue
    }

    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(<h3 key={key++}>{formatInlineText(trimmed.slice(4))}</h3>)
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={key++}>{formatInlineText(trimmed.slice(3))}</h3>)
    } else if (trimmed.startsWith('- ')) {
      currentList.push(trimmed.slice(2))
    } else {
      flushList()
      elements.push(<p key={key++}>{formatInlineText(trimmed)}</p>)
    }
  }
  flushList()

  return <>{elements}</>
}

// Safe inline text formatting - handles **bold** without HTML injection
function formatInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  const boldRegex = /\*\*(.*?)\*\*/g
  let match

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(<strong key={key++}>{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}
