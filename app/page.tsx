'use client'

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'

interface AnalysisResult {
  verdict: 'safe' | 'caution' | 'avoid'
  summary: string
  analysis: string
}

export default function Home() {
  const [apiKey, setApiKey] = useState('')

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service worker registration failed:', err)
      })
    }
  }, [])
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
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

    const reader = new FileReader()
    reader.onload = (e) => {
      setImage(e.target?.result as string)
      setFileName(file.name)
      setResult(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleAnalyze = async () => {
    if (!image || !apiKey) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
          apiKey,
        }),
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

  const clearImage = () => {
    setImage(null)
    setFileName('')
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Kidney Nutrition Analyzer</h1>
        <p>Upload nutrition facts to check if they&apos;re kidney-friendly</p>
      </header>

      <div className="card">
        <div className="api-key-section">
          <label htmlFor="api-key">Anthropic API Key</label>
          <input
            id="api-key"
            type="password"
            className="api-key-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <p className="api-key-note">
            Your API key is sent directly to Anthropic and is not stored.
          </p>
        </div>

        <div className="upload-section">
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📷</div>
            <h3>Upload Nutrition Facts</h3>
            <p>Drag and drop an image or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={handleFileSelect}
            />
          </div>

          {image && (
            <div className="preview-section">
              <img src={image} alt="Nutrition facts preview" className="preview-image" />
              <p style={{ color: '#666', marginBottom: '1rem' }}>{fileName}</p>
              <button className="clear-btn" onClick={clearImage}>
                Clear Image
              </button>
            </div>
          )}
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={!image || !apiKey || isAnalyzing}
        >
          {isAnalyzing ? (
            <span className="loading">
              <span className="spinner"></span>
              Analyzing...
            </span>
          ) : (
            'Analyze for Kidney Health'
          )}
        </button>

        {error && <div className="error-message">{error}</div>}

        {result && (
          <div className="results-section">
            <div className="results-header">
              <span>
                {result.verdict === 'safe' && '✅'}
                {result.verdict === 'caution' && '⚠️'}
                {result.verdict === 'avoid' && '❌'}
              </span>
              <h2>Analysis Results</h2>
            </div>

            <div className={`verdict ${result.verdict}`}>
              <h3>
                {result.verdict === 'safe' && 'Generally Kidney-Friendly'}
                {result.verdict === 'caution' && 'Use Caution'}
                {result.verdict === 'avoid' && 'Best to Avoid'}
              </h3>
              <p>{result.summary}</p>
            </div>

            <div
              className="analysis-content"
              dangerouslySetInnerHTML={{ __html: formatAnalysis(result.analysis) }}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function formatAnalysis(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match
      return `<p>${match}</p>`
    })
}
