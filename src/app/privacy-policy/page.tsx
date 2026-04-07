import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Elena",
  description: "Elena Privacy Policy - how we collect, use, and protect your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="font-[family-name:var(--font-inter)]">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-8 pt-28 pb-20 max-md:pt-20 max-md:pb-14">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
        </div>
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div className="absolute rounded-full blur-[80px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]" />
          <div className="absolute rounded-full blur-[80px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]" />
        </div>
        <div className="relative z-[4] text-center max-w-[700px]">
          <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] font-light leading-[1.15] tracking-tight text-white">
            Privacy{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">Policy</em>
          </h1>
          <p className="text-[1.15rem] font-light text-white/85 mt-4 tracking-wide">
            Last Updated: April 7, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 bg-white">
        <div className="mx-auto max-w-[720px]">

          {/* 1. Introduction */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Introduction</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena is a healthcare navigation tool designed to help individuals manage appointments, insurance information, medical bills, medications, and other healthcare logistics. Elena uses artificial intelligence to assist you in understanding your healthcare options, finding providers, comparing costs, and organizing your medical information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, how we share it, and how we protect it. By using Elena, you agree to the practices described in this policy.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            This policy applies to all users of the Elena mobile application and related services operated by Elena AI (&quot;Elena,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          </p>

          {/* 2. Information We Collect */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Information We Collect</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">When you use Elena, you may choose to provide the following categories of information:</p>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Account Information</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Name</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Email address</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Phone number</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Profile photo</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Date of birth</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Location (city, state, or zip code)</li>
          </ul>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Health and Healthcare Information</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical conditions and diagnoses</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medications and prescriptions</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Healthcare providers and facilities</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Appointment information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Insurance information, including plan details and member IDs</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical bills or cost data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Notes or recordings from medical visits</li>
          </ul>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Health Risk Assessment Data</h3>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you use Elena&apos;s health risk assessment features, we may collect information about your health history, family medical history, lifestyle factors, and symptoms you report. This information is used to help you understand your healthcare needs and find appropriate providers.
          </p>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Uploaded Documents</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Insurance card photos</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical bills and Explanation of Benefits (EOB) documents</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Lab results and medical records</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Other healthcare documents you choose to upload</li>
          </ul>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Call Recordings</h3>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            When Elena places phone calls on your behalf (for example, to schedule appointments, verify insurance coverage, or resolve billing questions), those calls may be recorded. Please see the &quot;Call Recording&quot; section below for full details on how recordings are handled.
          </p>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Device and Usage Data</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">App usage activity and feature interactions</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Device type, operating system, and version</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Diagnostic and crash information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">IP address and general location data</li>
          </ul>

          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">You control what health information you choose to provide. Elena does not access your device&apos;s health data (such as Apple Health or Google Fit) unless you explicitly authorize it.</p>

          {/* 3. How We Use Information */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">How We Use Information</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Provide Elena&apos;s healthcare navigation features</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Schedule or manage appointments on your behalf</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Place phone calls on your behalf to healthcare providers, insurance companies, and billing departments</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Help estimate and compare healthcare costs</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Help track and organize your medical information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Process, analyze, and store healthcare documents you upload</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Find healthcare providers that match your needs and insurance coverage</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Provide personalized healthcare guidance based on your health profile</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Improve the performance and reliability of the app</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Provide customer support</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Comply with legal obligations</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Your health information, documents, and conversations are processed by artificial intelligence (AI) and large language model (LLM) systems to perform these tasks. Please see the &quot;Artificial Intelligence and Automated Processing&quot; section below for details on how AI is used.
          </p>

          {/* 4. Artificial Intelligence and Automated Processing */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Artificial Intelligence and Automated Processing</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena uses artificial intelligence systems, including large language models provided by Anthropic (specifically, Anthropic&apos;s Claude), to power core features of the application. When you interact with Elena, your data may be sent to these AI systems for processing.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">AI is used for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Understanding your health questions and providing relevant guidance</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Finding providers that match your needs, location, and insurance</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Comparing costs across providers and facilities</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Processing and extracting information from uploaded documents (insurance cards, medical bills, lab results)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Conducting phone calls on your behalf</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Organizing and summarizing your healthcare information</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We send only the minimum necessary data to AI systems for each specific task. For example, if you ask Elena to find an in-network dermatologist, we may send your insurance plan details and location, but not your full medical history.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Anthropic, our AI provider, does not use data submitted through their API to train their models. Your health information sent to Anthropic for processing is not used to improve or train AI systems. For more details, please refer to{" "}
            <a href="https://www.anthropic.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2E6BB5] hover:underline">Anthropic&apos;s Privacy Policy</a>.
          </p>

          {/* 5. Call Recording */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Call Recording</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            When Elena places phone calls on your behalf, those calls may be recorded for quality assurance, record-keeping, and to provide you with a summary of what was discussed or accomplished during the call.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena announces at the beginning of each call that the call may be recorded. By using Elena&apos;s call features, you consent to the recording of calls placed on your behalf.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Call recordings are stored securely and treated with the same level of protection as your health data. Recordings are accessible to you through your Elena account and are subject to the same data retention and deletion policies as other health information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            Several states require all-party consent for recording telephone conversations. Elena complies with these requirements by announcing recording at the start of each call. These states include:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">California</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Connecticut</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Florida</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Illinois</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Maryland</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Massachusetts</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Montana</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">New Hampshire</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Oregon</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Pennsylvania</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Washington</li>
          </ul>

          {/* 6. Data Sharing */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Data Sharing</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We do not sell your personal information or health data. We will never sell your health data to data brokers, advertisers, or other third parties.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            We share limited information with the following categories of service providers that help operate the app:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Cloud hosting and database services</strong> (Supabase, Amazon Web Services) for secure data storage and application infrastructure</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>AI processing services</strong> (Anthropic) for powering Elena&apos;s intelligent features, as described in the &quot;Artificial Intelligence and Automated Processing&quot; section</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Telephony services</strong> for placing phone calls on your behalf to healthcare providers, insurance companies, and billing departments</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Analytics services</strong> (Mixpanel) for understanding app usage patterns and improving the product. Analytics data is aggregated and does not include your health information</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            All service providers are bound by data processing agreements that require them to protect your data, use it only to provide services to Elena, and not retain it beyond what is necessary. Service providers may not use your data for their own purposes, including training AI models.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            We may also disclose information when required by law, such as in response to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">A valid subpoena, court order, or other legal process</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">A request from law enforcement when we believe disclosure is necessary to prevent harm</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">A government audit or regulatory inquiry</li>
          </ul>

          {/* 7. Data Security */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Data Security</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We use reasonable administrative, technical, and physical safeguards designed to protect your information. We take the security of your health data seriously and implement practices consistent with industry standards for protecting sensitive health information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">Our security practices include:</p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Encryption of data at rest and in transit using industry-standard protocols (TLS 1.2+, AES-256)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Access controls and role-based authentication for internal systems</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Audit logging of access to sensitive data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Regular security assessments and vulnerability testing</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Secure software development practices</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Employee and contractor security training</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            While Elena is not a HIPAA-covered entity, we voluntarily implement security practices consistent with HIPAA standards to provide a high level of protection for your health data.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            No system can be guaranteed to be completely secure. If you believe your account has been compromised, please contact us immediately at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>.
          </p>

          {/* 8. Data Retention */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Data Retention</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We retain your information as long as your account is active or as necessary to provide the service. Specific retention periods vary by data type:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Account information</strong> is retained for the life of your account</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Health and healthcare information</strong> is retained for the life of your account unless you delete specific items</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Call recordings</strong> are retained for up to 12 months, unless you request earlier deletion</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Usage and analytics data</strong> may be retained in anonymized or aggregated form after account deletion</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            You may request deletion of your account and associated data at any time. Upon receiving a deletion request, we will delete or de-identify your personal information within 45 days, except where we are required by law to retain certain records.
          </p>

          {/* 9. Your Rights */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Your Rights</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            Depending on where you live, you may have some or all of the following rights regarding your personal information:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to access.</strong> You may request a copy of the personal information we hold about you.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to correct.</strong> You may request that we correct inaccurate personal information.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to delete.</strong> You may request that we delete your personal information, subject to certain legal exceptions.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to withdraw consent.</strong> Where we rely on your consent to process health data, you may withdraw that consent at any time.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to data portability.</strong> You may request a copy of your data in a structured, commonly used, machine-readable format.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to opt out of sale.</strong> We do not sell personal information. However, where applicable law provides this right, you may exercise it.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]"><strong>Right to limit use of sensitive personal information.</strong> You may request that we limit our use of sensitive personal information (including health data) to what is necessary to provide the service.</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            To exercise any of these rights, please contact us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>. We will respond to your request within 45 days. We will not discriminate against you for exercising your privacy rights.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            To protect your privacy, we may need to verify your identity before fulfilling your request. We will typically verify your identity by confirming information associated with your account (such as your email address).
          </p>

          {/* 10. State-Specific Privacy Rights */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">State-Specific Privacy Rights</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Certain states provide additional privacy protections for their residents. The following sections describe your rights under specific state laws.
          </p>

          {/* Washington */}
          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Washington Residents (My Health My Data Act, RCW 19.373)</h3>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            The Washington My Health My Data Act provides Washington residents with specific rights over their &quot;consumer health data,&quot; which includes data that identifies a consumer&apos;s past, present, or future physical or mental health status.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Categories of health data collected.</strong> Elena collects the following categories of consumer health data, as described in detail above: medical conditions, medications, insurance details, healthcare provider information, appointment data, medical bills, uploaded health documents, health risk assessment data, and call recordings related to healthcare matters.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Purposes.</strong> We collect and use this data to provide healthcare navigation services, including finding providers, comparing costs, scheduling appointments, placing calls on your behalf, and organizing your health information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Third parties.</strong> We share consumer health data with the service providers listed in the &quot;Data Sharing&quot; section above, including cloud hosting providers (Supabase, AWS), AI processing services (Anthropic), telephony services, and analytics services (Mixpanel).
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Consent.</strong> Before collecting consumer health data, Elena will obtain your separate and express consent, as required by the Act. You may withdraw your consent at any time.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Your rights under this law include:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to confirm whether we are collecting, sharing, or selling your consumer health data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to access your consumer health data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to delete your consumer health data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to withdraw consent for collection or sharing of your consumer health data</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            To exercise these rights, please contact us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>.
          </p>

          {/* California */}
          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">California Residents (CCPA/CPRA, Cal. Civ. Code 1798.100 et seq.)</h3>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you are a California resident, the California Consumer Privacy Act, as amended by the California Privacy Rights Act (collectively, &quot;CCPA&quot;), provides you with specific rights regarding your personal information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Categories of personal information collected in the past 12 months:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Identifiers (name, email address, phone number)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Internet or other electronic network activity (app usage, device data)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Geolocation data (general location from IP address or user-provided zip code)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Audio information (call recordings placed on your behalf)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Professional or employment-related information (if provided)</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Categories of sensitive personal information collected in the past 12 months:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Health information (medical conditions, medications, insurance details, medical bills)</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Account log-in credentials</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Your rights under the CCPA include:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to know what personal information we collect, use, disclose, and sell</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to delete your personal information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to correct inaccurate personal information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to opt out of the sale or sharing of personal information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to limit the use and disclosure of sensitive personal information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to non-discrimination for exercising your privacy rights</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            <strong>Do Not Sell or Share My Personal Information.</strong> Elena does not sell your personal information. Elena does not share your personal information for cross-context behavioral advertising purposes.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            <strong>Limit the Use of My Sensitive Personal Information.</strong> We use sensitive personal information (including health data) only as necessary to provide the Elena service you have requested. You may request that we further limit our use of sensitive personal information by contacting us.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            <strong>How to submit a request.</strong> To exercise your rights, contact us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>. We will verify your identity by confirming information associated with your account. You may also designate an authorized agent to submit a request on your behalf, provided you give the agent written permission and we can verify your identity.
          </p>

          {/* Connecticut */}
          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Connecticut Residents (CTDPA, Conn. Gen. Stat. 42-515 et seq.)</h3>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you are a Connecticut resident, the Connecticut Data Privacy Act (CTDPA) provides you with specific rights regarding your personal data.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            <strong>Sensitive data.</strong> Health data is considered sensitive data under the CTDPA. Elena obtains your opt-in consent before processing sensitive data, including health information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            <strong>Your rights under the CTDPA include:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to confirm whether we are processing your personal data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to access your personal data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to correct inaccurate personal data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to delete your personal data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to data portability</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to opt out of targeted advertising. Elena does not engage in targeted advertising</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to opt out of the sale of personal data. Elena does not sell personal data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Right to opt out of profiling in furtherance of decisions that produce legal or similarly significant effects</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena conducts data protection assessments for processing activities that present a heightened risk of harm to consumers, as required by the CTDPA. To exercise your rights, please contact us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>.
          </p>

          {/* Nevada */}
          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Nevada Residents (NRS 603A)</h3>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you are a Nevada resident, you have the right to opt out of the sale of certain &quot;covered information&quot; as defined under Nevada Revised Statutes Chapter 603A. Elena does not sell your covered information as defined by this law. If you wish to submit an opt-out request, please contact us at{" "}
            <a href="mailto:privacy@elena.health" className="text-[#2E6BB5] hover:underline">privacy@elena.health</a>.
          </p>

          {/* 11. HIPAA Disclosure */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">HIPAA Disclosure</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena is not a &quot;covered entity&quot; or &quot;business associate&quot; as those terms are defined under the Health Insurance Portability and Accountability Act of 1996 (HIPAA). Elena collects health information directly from you, not from healthcare providers, health plans, or healthcare clearinghouses.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Although HIPAA does not apply to Elena, we voluntarily follow security practices that are consistent with HIPAA standards for protecting health information. We do this because we believe your health data deserves a high level of protection regardless of regulatory requirements.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            This voluntary adoption of HIPAA-aligned practices does not create any HIPAA obligations or make Elena subject to HIPAA regulations. Your rights regarding your health data are governed by this Privacy Policy and applicable state and federal consumer protection laws.
          </p>

          {/* 12. Children's Privacy */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Children&apos;s Privacy</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will take steps to delete that information promptly. If you believe a child under 13 has provided us with personal information, please contact us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>.
          </p>

          {/* 13. Changes to This Policy */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Changes to This Policy</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We may update this Privacy Policy from time to time. When we make material changes, we will notify you by updating the &quot;Last Updated&quot; date at the top of this page and, where required by law, by providing additional notice (such as an in-app notification or email). Your continued use of Elena after the effective date of changes constitutes acceptance of the updated policy.
          </p>

          {/* 14. Contact */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Contact</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at:
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            <strong>General inquiries and privacy rights requests:</strong>{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            <strong>State-specific privacy requests (including Nevada opt-out requests):</strong>{" "}
            <a href="mailto:privacy@elena.health" className="text-[#2E6BB5] hover:underline">privacy@elena.health</a>
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">
            Elena AI, Inc.
            <br />
            New York, NY
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 pt-20 pb-10 px-8 text-white overflow-hidden" style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_85%_130%,rgba(244,176,132,0.25)_0%,rgba(232,149,109,0.15)_25%,transparent_60%)]" />
        <div className="relative mx-auto max-w-[960px]">
          <div className="text-[clamp(3rem,8vw,5rem)] font-light tracking-tight text-white mb-2">elena</div>
          <p className="text-base font-light text-white/60 mb-12">Your healthcare assistant.</p>

          <div className="grid grid-cols-3 gap-8 mb-10 max-md:grid-cols-1 max-md:text-center">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Product</p>
              <div className="flex flex-col gap-2">
                <Link href="/#how-it-works" className="text-sm text-white/60 no-underline transition-colors hover:text-white">How it Works</Link>
                <Link href="/#features" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Features</Link>
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                <Link href="/terms-of-service" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Terms of Service</Link>
                <Link href="/privacy-policy" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Connect</p>
              <div className="flex flex-col gap-2">
                <Link href="/blog" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Blog</Link>
                <Link href="/research" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Research</Link>
                <Link href="/support" className="text-sm text-white/60 no-underline transition-colors hover:text-white">Support</Link>
                <a href="https://www.tiktok.com/@elenahealth" target="_blank" rel="noopener noreferrer" className="text-sm text-white/60 no-underline transition-colors hover:text-white">TikTok</a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[0.78rem] text-white/30 max-md:flex-col max-md:gap-1.5 max-md:text-center">
            <span>&copy; 2026 Elena AI. All rights reserved.</span>
            <span>Made with love in NYC</span>
          </div>
          <div className="mt-4 text-[0.7rem] text-white/20 font-light text-center leading-relaxed">
            Elena helps you navigate healthcare costs and logistics. Not a substitute for medical advice. Pricing data from CMS-mandated hospital price transparency files.
          </div>
        </div>
      </footer>
    </div>
  );
}
