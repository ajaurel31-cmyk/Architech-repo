'use client';

import Link from 'next/link';

export default function DisclaimerPage() {
  return (
    <div className="container">
      <header className="header">
        <Link href="/settings" className="btn-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </Link>
        <h1 className="header-title">Medical Disclaimer</h1>
        <div style={{ width: 40 }} />
      </header>

      <div className="legal-content">
        <div className="card" style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ color: 'var(--danger)', marginBottom: 8 }}>Important Notice</h3>
            <p style={{ fontWeight: 600 }}>GoutGuard is NOT a medical device. It is NOT intended to diagnose, treat, cure, or prevent gout or any other medical condition.</p>
          </div>
        </div>

        <section className="legal-section">
          <h2 className="legal-heading">For Informational Purposes Only</h2>
          <p>All information provided by GoutGuard — including food purine analysis, uric acid tracking insights, flare pattern observations, meal recommendations, and medication reminders — is for <strong>educational and informational purposes only</strong>.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Not Medical Advice</h2>
          <p>The content in this app does not constitute medical advice and should not be used as a substitute for professional medical consultation. Gout is a complex medical condition that requires proper diagnosis and management by qualified healthcare professionals.</p>
          <p><strong>Always consult your doctor or rheumatologist before:</strong></p>
          <ul>
            <li>Making changes to your diet based on app recommendations</li>
            <li>Starting, stopping, or changing any medication</li>
            <li>Making decisions about gout treatment during a flare</li>
            <li>Interpreting uric acid test results</li>
            <li>Making any health-related decisions based on app data</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">AI Analysis Limitations</h2>
          <p>The AI-powered food analysis feature provides <strong>estimates</strong> of purine content based on visual analysis. These estimates:</p>
          <ul>
            <li>May not be 100% accurate</li>
            <li>Are approximations, not laboratory-measured values</li>
            <li>May vary based on food preparation methods, portion sizes, and specific ingredients</li>
            <li>Should not be the sole basis for dietary decisions</li>
            <li>Cannot account for individual variations in purine metabolism</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Purine Database</h2>
          <p>The purine values in our food database are compiled from published nutritional research and may vary from actual purine content in specific food items due to differences in preparation, sourcing, and individual food samples.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Medication Information</h2>
          <p>The medication tracking feature is a reminder tool only. GoutGuard does not provide:</p>
          <ul>
            <li>Drug dosage recommendations</li>
            <li>Comprehensive drug interaction checks</li>
            <li>Medical prescriptions or pharmaceutical advice</li>
          </ul>
          <p>Drug interaction warnings shown in the app are general guidelines and may not cover all possible interactions. Always verify medication information with your pharmacist or doctor.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Emergency Situations</h2>
          <p>If you are experiencing a severe gout flare, symptoms of a medical emergency, or adverse reactions to medication, <strong>seek immediate medical attention</strong>. Do not rely on this app for emergency medical guidance.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Individual Variation</h2>
          <p>Gout management is highly individual. What works for one person may not work for another. Factors including genetics, kidney function, other medical conditions, and medications can all affect how your body handles purines and uric acid. This app provides general guidance that may not apply to your specific situation.</p>
        </section>

        <section className="legal-section">
          <h2 className="legal-heading">Acknowledgment</h2>
          <p>By using GoutGuard, you acknowledge that:</p>
          <ul>
            <li>You understand this app is not a substitute for professional medical care</li>
            <li>You will consult healthcare professionals for medical decisions</li>
            <li>AI-generated content may contain inaccuracies</li>
            <li>You use the app&apos;s information at your own discretion and risk</li>
            <li>The developers are not liable for any health outcomes related to app use</li>
          </ul>
        </section>

        <p className="text-tertiary" style={{ marginTop: 32, fontSize: 13 }}>Last updated: February 2026</p>
      </div>
    </div>
  );
}
