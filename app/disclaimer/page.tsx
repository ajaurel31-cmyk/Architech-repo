'use client'

import Link from 'next/link'

export default function DisclaimerPage() {
  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="back-link">
          ← Back to App
        </Link>
        <h1>Terms of Use &amp; Medical Disclaimer</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <div className="card disclaimer-page">
        <section className="disclaimer-section">
          <h2>Medical Disclaimer</h2>
          <p>
            <strong>IMPORTANT: This application is for informational and educational purposes only.</strong>
          </p>
          <p>
            The Post-Kidney Transplant Nutrition Guide (&quot;TransplantFood&quot;) is not intended to be a substitute
            for professional medical advice, diagnosis, or treatment. The information provided by this application,
            including but not limited to nutrition analysis, meal recommendations, and medication reminders, should
            not be used for diagnosing or treating a health problem or disease.
          </p>
          <p>
            <strong>Always seek the advice of your transplant physician, nephrologist, registered dietitian,
            or other qualified healthcare provider</strong> with any questions you may have regarding your diet,
            medications, or medical condition. Never disregard professional medical advice or delay in seeking
            it because of something you have read or received from this application.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>No Doctor-Patient Relationship</h2>
          <p>
            Use of this application does not create a doctor-patient or dietitian-client relationship. The
            information provided is general in nature and may not apply to your specific medical situation.
            Every transplant patient is unique, and dietary requirements can vary based on:
          </p>
          <ul>
            <li>Time since transplant surgery</li>
            <li>Current kidney function and lab values</li>
            <li>Other medical conditions (diabetes, heart disease, etc.)</li>
            <li>Current medications and potential interactions</li>
            <li>Individual allergies and intolerances</li>
            <li>Your transplant center&apos;s specific protocols</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>AI-Generated Content Disclaimer</h2>
          <p>
            This application uses artificial intelligence (AI) to analyze nutrition labels and generate meal
            recommendations. While we strive for accuracy, AI-generated content may contain errors, omissions,
            or inaccuracies. The AI:
          </p>
          <ul>
            <li>May not correctly identify all ingredients in an image</li>
            <li>May not be aware of the latest medical research or guidelines</li>
            <li>Cannot account for your individual medical history or current health status</li>
            <li>May provide general recommendations that are not appropriate for your specific situation</li>
            <li>Should never be relied upon as the sole source of nutritional or medical guidance</li>
          </ul>
          <p>
            <strong>You should always verify any information provided by this app with your healthcare team
            before making dietary decisions.</strong>
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Medication Reminders Disclaimer</h2>
          <p>
            The medication reminder feature is provided as a convenience tool only. This application:
          </p>
          <ul>
            <li>Does not guarantee delivery of notifications</li>
            <li>Should not be your only method of remembering medications</li>
            <li>Does not verify medication dosages, timing, or interactions</li>
            <li>Is not a replacement for pharmacy or medical supervision</li>
          </ul>
          <p>
            <strong>Missing immunosuppressant medications can lead to organ rejection.</strong> Always maintain
            backup reminder systems and follow your transplant team&apos;s medication protocols exactly as prescribed.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Food Safety Warning</h2>
          <p>
            Post-kidney transplant patients are immunocompromised and at higher risk for foodborne illness.
            This application provides general guidance but cannot account for:
          </p>
          <ul>
            <li>How food was prepared, stored, or handled</li>
            <li>Local food safety conditions</li>
            <li>Individual immune system status</li>
            <li>Restaurant or manufacturer food safety practices</li>
          </ul>
          <p>
            Always follow food safety guidelines provided by your transplant center.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Emergency Situations</h2>
          <p>
            <strong>If you are experiencing a medical emergency, call 911 or your local emergency services
            immediately.</strong> Do not use this application to make decisions in emergency situations.
          </p>
          <p>
            Contact your transplant center immediately if you experience:
          </p>
          <ul>
            <li>Fever over 100.4&deg;F (38&deg;C)</li>
            <li>Signs of rejection (decreased urine output, swelling, pain over transplant)</li>
            <li>Severe vomiting or diarrhea</li>
            <li>Signs of infection</li>
            <li>Missed doses of immunosuppressant medications</li>
          </ul>
        </section>

        <section className="disclaimer-section">
          <h2>Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TRANSPLANTFOOD, ITS DEVELOPERS,
            AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Personal injury or death</li>
            <li>Organ rejection or transplant complications</li>
            <li>Adverse reactions to foods or medications</li>
            <li>Loss of data or information</li>
            <li>Any other damages arising from use of this application</li>
          </ul>
          <p>
            YOUR USE OF THIS APPLICATION IS AT YOUR OWN RISK. THE APPLICATION IS PROVIDED &quot;AS IS&quot; AND
            &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless TransplantFood, its developers, officers, directors,
            employees, agents, and affiliates from and against any and all claims, damages, obligations, losses,
            liabilities, costs, and expenses arising from your use of the application or your violation of these
            Terms of Use.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Acceptance of Terms</h2>
          <p>
            By using this application, you acknowledge that you have read, understood, and agree to be bound by
            these Terms of Use and Medical Disclaimer. If you do not agree to these terms, do not use this
            application.
          </p>
        </section>

        <section className="disclaimer-section">
          <h2>Contact Your Healthcare Team</h2>
          <p>
            For questions about your specific dietary needs after kidney transplant, please contact:
          </p>
          <ul>
            <li>Your transplant nephrologist</li>
            <li>Your transplant coordinator</li>
            <li>A registered dietitian specializing in renal nutrition</li>
            <li>Your primary care physician</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
