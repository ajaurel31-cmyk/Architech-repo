'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">
          &larr; Back to App
        </Link>
        <h1>Terms of Service</h1>
        <p>Last updated: February 2026</p>
      </header>

      <div className="card disclaimer-page">
        <section className="disclaimer-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using the KidneyCare+ application (&quot;App&quot;), you agree to
            be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not
            use the App.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>2. Description of Service</h2>
          <p>
            KidneyCare+ is a mobile application designed to assist post-kidney transplant patients with:
          </p>
          <ul>
            <li>Analyzing nutrition labels for transplant safety using artificial intelligence</li>
            <li>Providing meal recommendations suitable for transplant patients</li>
            <li>Setting medication reminders</li>
            <li>Tracking health vitals (blood pressure and glucose)</li>
          </ul>
          <p>
            The App is for <strong>informational and educational purposes only</strong> and does not provide
            medical advice. See our <Link href="/disclaimer">Medical Disclaimer</Link> for more details.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>3. Eligibility</h2>
          <p>
            You must be at least 17 years of age to use this App. By using the App, you represent
            and warrant that you meet this age requirement.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>4. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Use the App only for its intended purpose as a health information tool</li>
            <li>Not rely solely on the App for medical decisions</li>
            <li>Consult your healthcare provider before making dietary or medication changes</li>
            <li>Keep your device secure to protect your health data stored locally</li>
            <li>Not attempt to reverse-engineer, modify, or distribute the App</li>
            <li>Not use the App in any manner that could damage or impair the service</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>5. In-App Purchases</h2>
          <p>
            Certain features of the App (Health Vitals tracking and Meal Recommendations) require a one-time
            in-app purchase. All purchases are processed through Apple&apos;s App Store and are subject to
            Apple&apos;s terms and conditions.
          </p>
          <ul>
            <li>Prices are displayed before purchase and include applicable taxes</li>
            <li>Purchases are non-consumable and can be restored on the same Apple ID</li>
            <li>Refund requests must be made through Apple</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>6. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the App, including but not limited to text,
            graphics, logos, icons, and software, are the property of KidneyCare+ and are protected
            by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>7. Data and Privacy</h2>
          <p>
            Your use of the App is also governed by our <Link href="/privacy">Privacy Policy</Link>.
            Key points:
          </p>
          <ul>
            <li>Health data (medications, vitals) is stored locally on your device with encryption</li>
            <li>Nutrition label images are sent to our AI provider (Anthropic) for analysis and are not permanently stored</li>
            <li>We do not create user accounts or store personal data on our servers</li>
            <li>Push notification tokens are used solely for medication reminders</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>8. Service Availability</h2>
          <p>
            We strive to keep the App available at all times, but we do not guarantee uninterrupted
            access. The service may be temporarily unavailable due to:
          </p>
          <ul>
            <li>Maintenance or updates</li>
            <li>Server or network issues</li>
            <li>Third-party service disruptions (AI analysis provider)</li>
            <li>Force majeure events</li>
          </ul>
          <p>
            Offline features (medication reminders, vitals tracking) will continue to function
            without an internet connection.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, KIDNEYCARE+ AND ITS DEVELOPERS SHALL NOT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING
            FROM YOUR USE OF THE APP. See our <Link href="/disclaimer">full disclaimer</Link> for
            additional details.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>10. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective when
            posted within the App. Your continued use of the App after changes constitutes acceptance
            of the modified Terms.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>11. Termination</h2>
          <p>
            You may stop using the App at any time by uninstalling it from your device. All locally
            stored data will be deleted upon uninstallation. Purchased features remain tied to your
            Apple ID and can be restored if you reinstall.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            United States, without regard to conflict of law provisions.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>13. Contact</h2>
          <p>
            For questions about these Terms, contact us at:{' '}
            <a href="mailto:support@kidneycare.app">support@kidneycare.app</a>
          </p>
        </section>
      </div>
    </main>
  )
}
