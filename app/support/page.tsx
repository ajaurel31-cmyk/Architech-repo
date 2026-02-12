'use client'

import Link from 'next/link'

export default function SupportPage() {
  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">
          &larr; Back to App
        </Link>
        <h1>Support</h1>
        <p>We&apos;re here to help</p>
      </header>

      <div className="card disclaimer-page">
        <section className="disclaimer-section">
          <h2>Contact Us</h2>
          <p>
            If you need help with KidneyCare+, have questions, or want to report a problem,
            please reach out to our support team:
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@kidneycare.app">support@kidneycare.app</a>
          </p>
          <p>
            We aim to respond to all support requests within 24&ndash;48 hours.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Frequently Asked Questions</h2>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            How does the food scanner work?
          </h3>
          <p>
            Take a photo of a nutrition label or ingredients list, and our AI analyzes it
            for safety considerations specific to post-kidney transplant patients. The analysis
            checks for high sodium, potassium, phosphorus, and other nutrients that may need
            monitoring after a transplant.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            Is KidneyCare+ a substitute for medical advice?
          </h3>
          <p>
            No. KidneyCare+ is for <strong>informational purposes only</strong>. Always consult
            your transplant care team, dietitian, or healthcare provider before making dietary
            changes. See our <Link href="/disclaimer">Medical Disclaimer</Link> for details.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            How do I unlock Meal Recommendations or Health Vitals?
          </h3>
          <p>
            These are premium features available as one-time in-app purchases. Open the
            Meal Recommendations or Health Vitals section in the app, and tap the unlock
            button to purchase. If you&apos;ve already purchased, tap &quot;Restore Purchase&quot;
            to recover your access.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            I purchased a feature but lost access. What should I do?
          </h3>
          <p>
            Go to the feature page (Meal Recommendations or Health Vitals) and tap
            &quot;Restore Purchase.&quot; This will check your Apple ID for previous purchases
            and restore your access. If the issue persists, contact us at{' '}
            <a href="mailto:support@kidneycare.app">support@kidneycare.app</a>.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            Can I get a refund?
          </h3>
          <p>
            In-app purchases are processed by Apple. To request a refund, visit{' '}
            <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">
              reportaproblem.apple.com
            </a>{' '}
            and follow the instructions for your purchase.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            Is my data stored securely?
          </h3>
          <p>
            Yes. All your health data (vitals readings, medication lists, favorites) is stored
            locally on your device. We do not collect, store, or share your personal health
            information on any server. See our <Link href="/privacy">Privacy Policy</Link> for
            full details.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', marginTop: '1rem' }}>
            What devices are supported?
          </h3>
          <p>
            KidneyCare+ requires iOS 16.0 or later and works on iPhone and iPad.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Report a Bug</h2>
          <p>
            If you encounter a bug or the app isn&apos;t working as expected, please email us
            at <a href="mailto:support@kidneycare.app">support@kidneycare.app</a> with:
          </p>
          <ul>
            <li>Your device model and iOS version</li>
            <li>A description of the issue</li>
            <li>Steps to reproduce the problem</li>
            <li>Screenshots if applicable</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>Legal</h2>
          <p>
            <Link href="/disclaimer">Terms of Use (EULA)</Link> |{' '}
            <Link href="/privacy">Privacy Policy</Link> |{' '}
            <Link href="/terms">Terms of Service</Link>
          </p>
        </section>
      </div>
    </main>
  )
}
