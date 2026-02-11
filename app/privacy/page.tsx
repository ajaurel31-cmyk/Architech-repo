'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="container">
      <header className="header">
        <Link href="/settings" className="btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <h1 className="header-title">Privacy Policy</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2 className="legal-heading">Your Privacy Matters</h2>
          <p>GoutGuard is built with a privacy-first approach. We believe your health data belongs to you and only you.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Data Storage</h2>
          <p><strong>All your health data is stored locally on your device.</strong> This includes:</p>
          <ul>
            <li>Uric acid readings</li>
            <li>Gout flare records</li>
            <li>Medication information and dose logs</li>
            <li>Food and purine intake logs</li>
            <li>Water intake records</li>
            <li>App settings and preferences</li>
            <li>Saved meal favorites</li>
          </ul>
          <p>This data never leaves your device unless you explicitly choose to export it (e.g., PDF reports for your doctor).</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Image Processing</h2>
          <p>When you use the AI Food Scanner feature, your food images are sent to our AI analysis service (Anthropic Claude) for processing. These images are:</p>
          <ul>
            <li>Transmitted securely over HTTPS</li>
            <li>Used solely for the purpose of food analysis</li>
            <li>Not stored on our servers after analysis is complete</li>
            <li>Not used to train AI models</li>
            <li>Not shared with third parties</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">What We Do NOT Collect</h2>
          <ul>
            <li>Personal identification information (name, email, phone)</li>
            <li>Location data</li>
            <li>Health records or medical history</li>
            <li>Contact lists</li>
            <li>Browsing history</li>
            <li>Advertising identifiers</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Analytics</h2>
          <p>We may collect anonymous, aggregated usage statistics (such as which features are used most often) to improve the app. This data cannot be used to identify individual users and contains no health information.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Third-Party Services</h2>
          <p>GoutGuard uses the following third-party services:</p>
          <ul>
            <li><strong>Anthropic Claude API:</strong> For AI-powered food analysis and meal recommendations. Subject to Anthropic&apos;s privacy policy.</li>
            <li><strong>Apple StoreKit:</strong> For processing in-app subscriptions. Subject to Apple&apos;s privacy policy.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Data Deletion</h2>
          <p>You can delete all your data at any time through the Settings page (&quot;Clear All Data&quot;). Since data is stored locally on your device, uninstalling the app will also remove all data.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Children&apos;s Privacy</h2>
          <p>GoutGuard is not intended for use by children under 17. We do not knowingly collect data from children.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by updating the &quot;Last updated&quot; date below.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us through the App Store listing.</p>
        </section>

        <p className="text-tertiary" style={{ marginTop: 32, fontSize: 13 }}>Last updated: February 2026</p>
      </div>
    </div>
  );
}
