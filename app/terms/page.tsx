'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="container">
      <header className="header">
        <Link href="/settings" className="btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <h1 className="header-title">Terms of Service</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2 className="legal-heading">1. Acceptance of Terms</h2>
          <p>By downloading, installing, or using GoutGuard (&quot;the App&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">2. Description of Service</h2>
          <p>GoutGuard is a health and wellness application designed to help users manage gout through food scanning, purine tracking, uric acid monitoring, and dietary guidance. The App uses artificial intelligence to analyze food images and provide purine content estimates.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">3. Medical Disclaimer</h2>
          <p><strong>GoutGuard is NOT a medical device and is NOT intended to diagnose, treat, cure, or prevent any disease.</strong></p>
          <p>The information provided by GoutGuard is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician, rheumatologist, or other qualified healthcare provider with any questions you may have regarding gout or any medical condition.</p>
          <p>Never disregard professional medical advice or delay in seeking it because of information provided by this App.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">4. AI-Generated Content</h2>
          <p>The food analysis, purine estimates, and meal recommendations provided by GoutGuard are generated using artificial intelligence. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. Purine content estimates are approximate and should not be relied upon as precise nutritional data.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">5. Subscriptions and Payments</h2>
          <p>GoutGuard offers premium features through auto-renewable subscriptions:</p>
          <ul>
            <li>Monthly subscription</li>
            <li>Annual subscription</li>
          </ul>
          <p>Subscriptions are billed through Apple&apos;s App Store. Payment is charged to your Apple ID account at confirmation of purchase. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current billing period. You can manage and cancel subscriptions in your App Store account settings.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">6. Free Trial</h2>
          <p>New subscribers may be eligible for a 7-day free trial. If you do not cancel before the trial ends, you will be automatically charged for the subscription. Free trial eligibility is determined by Apple and may be limited to one trial per Apple ID.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">7. User Data</h2>
          <p>All health data entered into GoutGuard (uric acid readings, flare logs, medication records, food logs) is stored locally on your device. We do not collect, store, or transmit your personal health data to our servers. Images sent for AI analysis are processed and immediately discarded — they are not stored.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, GoutGuard and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to damages arising from: reliance on information provided by the App, dietary decisions made based on App recommendations, or any health outcomes related to use of the App.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">9. Changes to Terms</h2>
          <p>We reserve the right to modify these Terms of Service at any time. Continued use of the App after changes constitutes acceptance of the updated terms.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">10. Contact</h2>
          <p>If you have questions about these Terms of Service, please contact us through the App Store listing.</p>
        </section>

        <p className="text-tertiary" style={{ marginTop: 32, fontSize: 13 }}>Last updated: February 2026</p>
      </div>
    </div>
  );
}
