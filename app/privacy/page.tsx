'use client'

import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">
          ← Back to App
        </Link>
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <div className="card disclaimer-page">
        <section className="disclaimer-section">
          <h2>Introduction</h2>
          <p>
            TransplantFood (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
            our mobile application and web service.
          </p>
          <p>
            Please read this privacy policy carefully. By using TransplantFood, you agree to the collection and use
            of information in accordance with this policy.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Information We Collect</h2>

          <h3>Information You Provide</h3>
          <ul>
            <li><strong>Medication Information:</strong> Names, dosages, and reminder times for your medications.
            This data is stored locally on your device.</li>
            <li><strong>Food Images:</strong> Photos of nutrition labels you upload for analysis. These images are
            processed but not permanently stored on our servers.</li>
            <li><strong>Meal Preferences:</strong> Your saved favorite meals and dietary preferences, stored locally
            on your device.</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <ul>
            <li><strong>Push Notification Tokens:</strong> If you enable notifications, we collect device tokens
            to send medication reminders.</li>
            <li><strong>Usage Data:</strong> Anonymous analytics about app usage to improve our service.</li>
            <li><strong>Device Information:</strong> Device type, operating system, and browser type for
            compatibility purposes.</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Analyze nutrition labels using AI to provide dietary guidance</li>
            <li>Send medication reminder notifications at your scheduled times</li>
            <li>Generate personalized meal recommendations</li>
            <li>Improve and optimize our application</li>
            <li>Respond to your inquiries and provide customer support</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>Data Storage and Security</h2>
          <p>
            <strong>Local Storage:</strong> Your medication schedules, favorite meals, and preferences are stored
            locally on your device using browser storage. This data never leaves your device unless you explicitly
            share it.
          </p>
          <p>
            <strong>Image Processing:</strong> When you upload a nutrition label for analysis, the image is sent
            to our AI service (Anthropic Claude) for processing. Images are not permanently stored and are deleted
            after analysis.
          </p>
          <p>
            <strong>Security Measures:</strong> We implement appropriate technical and organizational measures to
            protect your personal information, including encryption in transit (HTTPS) and secure API communications.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Anthropic (Claude AI):</strong> For nutrition label analysis and meal recommendations.
            Subject to <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
            Anthropic&apos;s Privacy Policy</a>.</li>
            <li><strong>Vercel:</strong> For hosting our application. Subject to <a href="https://vercel.com/legal/privacy-policy"
            target="_blank" rel="noopener noreferrer">Vercel&apos;s Privacy Policy</a>.</li>
            <li><strong>Apple Push Notification Service:</strong> For iOS notifications.</li>
            <li><strong>Web Push Services:</strong> For browser-based notifications.</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>Health Information (HIPAA Notice)</h2>
          <p>
            <strong>Important:</strong> TransplantFood is designed as a personal wellness tool and is not a
            covered entity under HIPAA (Health Insurance Portability and Accountability Act). The medication
            information you enter is stored locally on your device and is not transmitted to or stored on
            our servers.
          </p>
          <p>
            If you have concerns about health data privacy, we recommend:
          </p>
          <ul>
            <li>Using a device passcode to protect your device</li>
            <li>Not sharing your device with others</li>
            <li>Regularly clearing app data if using a shared device</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> View all data stored locally in your browser settings</li>
            <li><strong>Delete:</strong> Clear all local data by clearing browser/app data</li>
            <li><strong>Opt-out:</strong> Disable notifications at any time in your device settings</li>
            <li><strong>Withdraw Consent:</strong> Stop using the app at any time</li>
          </ul>
          <p>
            To delete all your data, clear your browser&apos;s localStorage or uninstall the app from your device.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Children&apos;s Privacy</h2>
          <p>
            TransplantFood is not intended for use by children under 13 years of age. We do not knowingly collect
            personal information from children under 13. If you are a parent or guardian and believe your child
            has provided us with personal information, please contact us.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>International Users</h2>
          <p>
            If you are accessing TransplantFood from outside the United States, please be aware that your
            information may be transferred to, stored, and processed in the United States where our servers
            are located.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting
            the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <ul>
            <li>Email: privacy@transplantfood.app</li>
          </ul>
        </section>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/disclaimer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
            View Terms of Use &amp; Medical Disclaimer
          </Link>
        </div>
      </div>
    </main>
  )
}
