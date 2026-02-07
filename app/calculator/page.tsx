'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CalculationResult {
  annual: number
  monthly: number
  biweekly: number
  weekly: number
  daily: number
}

const DEFAULT_HOURS = 40
const DEFAULT_WEEKS = 52

function calculate(hourlyRate: number, hoursPerWeek: number, weeksPerYear: number): CalculationResult {
  const annual = hourlyRate * hoursPerWeek * weeksPerYear
  return {
    annual,
    monthly: annual / 12,
    biweekly: hourlyRate * hoursPerWeek * 2,
    weekly: hourlyRate * hoursPerWeek,
    daily: hourlyRate * hoursPerWeek / 5,
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function CalculatorPage() {
  const [hourlyRate, setHourlyRate] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState(DEFAULT_HOURS.toString())
  const [weeksPerYear, setWeeksPerYear] = useState(DEFAULT_WEEKS.toString())
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleCalculate = () => {
    const rate = parseFloat(hourlyRate)
    const hours = parseFloat(hoursPerWeek) || DEFAULT_HOURS
    const weeks = parseFloat(weeksPerYear) || DEFAULT_WEEKS

    if (isNaN(rate) || rate <= 0) {
      setResult(null)
      return
    }

    setResult(calculate(rate, hours, weeks))
  }

  const handleRateChange = (value: string) => {
    setHourlyRate(value)
    const rate = parseFloat(value)
    const hours = parseFloat(hoursPerWeek) || DEFAULT_HOURS
    const weeks = parseFloat(weeksPerYear) || DEFAULT_WEEKS

    if (!isNaN(rate) && rate > 0) {
      setResult(calculate(rate, hours, weeks))
    } else {
      setResult(null)
    }
  }

  const handleHoursChange = (value: string) => {
    setHoursPerWeek(value)
    const rate = parseFloat(hourlyRate)
    const hours = parseFloat(value) || DEFAULT_HOURS
    const weeks = parseFloat(weeksPerYear) || DEFAULT_WEEKS

    if (!isNaN(rate) && rate > 0) {
      setResult(calculate(rate, hours, weeks))
    }
  }

  const handleWeeksChange = (value: string) => {
    setWeeksPerYear(value)
    const rate = parseFloat(hourlyRate)
    const hours = parseFloat(hoursPerWeek) || DEFAULT_HOURS
    const weeks = parseFloat(value) || DEFAULT_WEEKS

    if (!isNaN(rate) && rate > 0) {
      setResult(calculate(rate, hours, weeks))
    }
  }

  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </Link>
        <h1>Hourly to Annual Calculator</h1>
        <p>Convert your hourly wage to see what you earn annually, monthly, biweekly, weekly, and daily</p>
      </header>

      <div className="card">
        <div className="calc-form">
          <div className="calc-field">
            <label htmlFor="hourlyRate">Hourly Rate ($)</label>
            <input
              id="hourlyRate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="e.g. 45.00"
              value={hourlyRate}
              onChange={(e) => handleRateChange(e.target.value)}
              className="calc-input"
              autoFocus
            />
          </div>

          <div className="calc-row">
            <div className="calc-field">
              <label htmlFor="hoursPerWeek">Hours / Week</label>
              <input
                id="hoursPerWeek"
                type="number"
                inputMode="decimal"
                min="0"
                max="168"
                step="1"
                value={hoursPerWeek}
                onChange={(e) => handleHoursChange(e.target.value)}
                className="calc-input"
              />
            </div>

            <div className="calc-field">
              <label htmlFor="weeksPerYear">Weeks / Year</label>
              <input
                id="weeksPerYear"
                type="number"
                inputMode="decimal"
                min="0"
                max="52"
                step="1"
                value={weeksPerYear}
                onChange={(e) => handleWeeksChange(e.target.value)}
                className="calc-input"
              />
            </div>
          </div>

          <button
            className="analyze-btn"
            onClick={handleCalculate}
            disabled={!hourlyRate || parseFloat(hourlyRate) <= 0}
          >
            Calculate
          </button>
        </div>

        {result && (
          <div className="calc-results">
            <div className="calc-result-primary">
              <span className="calc-result-label">Annual Salary</span>
              <span className="calc-result-value">{formatCurrency(result.annual)}</span>
            </div>

            <div className="calc-result-grid">
              <div className="calc-result-item">
                <span className="calc-result-label">Monthly</span>
                <span className="calc-result-value">{formatCurrency(result.monthly)}</span>
              </div>
              <div className="calc-result-item">
                <span className="calc-result-label">Biweekly</span>
                <span className="calc-result-value">{formatCurrency(result.biweekly)}</span>
              </div>
              <div className="calc-result-item">
                <span className="calc-result-label">Weekly</span>
                <span className="calc-result-value">{formatCurrency(result.weekly)}</span>
              </div>
              <div className="calc-result-item">
                <span className="calc-result-label">Daily</span>
                <span className="calc-result-value">{formatCurrency(result.daily)}</span>
              </div>
            </div>

            <div className="calc-summary">
              <p>
                At <strong>{formatCurrency(parseFloat(hourlyRate))}/hr</strong> working{' '}
                <strong>{hoursPerWeek} hrs/week</strong> for{' '}
                <strong>{weeksPerYear} weeks/year</strong>, you earn{' '}
                <strong>{formatCurrency(result.annual)}</strong> per year before taxes.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--color-primary, #2d8659);
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .back-link:hover {
          opacity: 0.8;
        }

        .calc-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .calc-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          flex: 1;
        }

        .calc-field label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary, #64748b);
        }

        .calc-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid var(--color-border, #e2e8f0);
          border-radius: 0.75rem;
          font-size: 1.125rem;
          font-family: inherit;
          background: var(--color-bg, #fff);
          color: var(--color-text, #1e293b);
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .calc-input:focus {
          outline: none;
          border-color: var(--color-primary, #2d8659);
        }

        .calc-row {
          display: flex;
          gap: 1rem;
        }

        .calc-results {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .calc-result-primary {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          background: var(--color-primary, #2d8659);
          border-radius: 1rem;
          color: #fff;
          gap: 0.25rem;
        }

        .calc-result-primary .calc-result-label {
          font-size: 0.875rem;
          font-weight: 500;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .calc-result-primary .calc-result-value {
          font-size: 2rem;
          font-weight: 700;
        }

        .calc-result-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .calc-result-item {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: var(--color-bg-secondary, #f8fafc);
          border-radius: 0.75rem;
          border: 1px solid var(--color-border, #e2e8f0);
          gap: 0.25rem;
        }

        .calc-result-item .calc-result-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-secondary, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .calc-result-item .calc-result-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text, #1e293b);
        }

        .calc-summary {
          padding: 1rem;
          background: var(--color-bg-secondary, #f8fafc);
          border-radius: 0.75rem;
          border-left: 4px solid var(--color-primary, #2d8659);
        }

        .calc-summary p {
          margin: 0;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: var(--color-text-secondary, #64748b);
        }

        @media (max-width: 480px) {
          .calc-result-primary .calc-result-value {
            font-size: 1.625rem;
          }
          .calc-result-item .calc-result-value {
            font-size: 1.0625rem;
          }
        }
      `}</style>
    </main>
  )
}
