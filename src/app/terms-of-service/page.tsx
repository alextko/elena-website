import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Elena",
  description: "Elena Terms of Service - your AI-powered healthcare assistant.",
};

export default function TermsOfServicePage() {
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
            Terms of{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">Service</em>
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
            Welcome to Elena. By accessing or using the Elena mobile application, website, or any related services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). These Terms constitute a legally binding agreement between you and Elena AI, Inc. (&quot;Elena,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you do not agree to these Terms, you may not access or use the Service. Please read these Terms carefully before using Elena.
          </p>

          {/* 2. Service Description */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Service Description</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena is an AI-powered healthcare navigation tool that helps users manage healthcare logistics. Our Service uses artificial intelligence to assist with tasks including, but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Scheduling and managing healthcare appointments</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Organizing and storing medical information and documents</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Estimating healthcare costs using publicly available pricing data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Placing phone calls to healthcare providers, insurance companies, and pharmacies on your behalf</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Processing and analyzing uploaded medical documents, bills, and insurance paperwork</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Providing AI-powered navigation of healthcare administrative tasks</li>
          </ul>

          {/* 3. Not Medical Advice */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Not Medical Advice</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena does not provide medical advice, diagnosis, treatment recommendations, or clinical decision-making of any kind. Elena is not a healthcare provider, and no information provided through the Service should be interpreted as medical guidance.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            All information provided through Elena is for organizational, logistical, and informational purposes only. You should always consult with qualified healthcare professionals for any medical decisions, including decisions about treatment, medication, and care.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            In the event of a medical emergency, call 911 or your local emergency services immediately. Do not rely on Elena for emergency medical assistance.
          </p>

          {/* 4. Account Registration and Security */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Account Registration and Security</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            To use Elena, you must create an account. By creating an account, you agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You must be at least 18 years of age to create an account and use the Service.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You must provide accurate, current, and complete information during registration and keep your account information up to date.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You are responsible for maintaining the security and confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to or use of your account.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Each account is for a single individual. You may not share your account with others or create multiple accounts.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You are responsible for all activity that occurs under your account.</li>
          </ul>

          {/* 5. Authorization to Act on Your Behalf */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Authorization to Act on Your Behalf</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Certain features of Elena allow us to place phone calls and communicate with third parties on your behalf. By using these features, you acknowledge and agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You authorize Elena to place phone calls to healthcare providers, insurance companies, pharmacies, and other relevant parties on your behalf.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You authorize Elena to communicate with these parties as your representative for the purpose of managing your healthcare logistics, including verifying insurance coverage, scheduling appointments, resolving billing questions, and similar administrative tasks.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Elena will identify itself as an AI assistant acting on your behalf at the beginning of all calls.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You are responsible for ensuring that you have the legal right to authorize such communications. If you are acting on behalf of another person (such as a dependent), you must have proper legal authority to do so.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Elena does not guarantee the outcome of any call or communication. Results depend on the cooperation and policies of the third parties contacted.</li>
          </ul>

          {/* 6. Call Recording and Consent */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Call Recording and Consent</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Calls placed by Elena on your behalf may be recorded for quality assurance, record-keeping, and to provide you with call summaries. By using Elena&apos;s call features, you agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You consent to the recording of calls placed by Elena on your behalf.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Elena will notify the other party at the beginning of each call that the call may be recorded.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You acknowledge that certain U.S. states require the consent of all parties to a call before recording. These states include, but may not be limited to: California, Connecticut, Florida, Illinois, Maryland, Massachusetts, Montana, New Hampshire, Oregon, Pennsylvania, and Washington.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You are responsible for understanding and ensuring compliance with call recording laws applicable in your jurisdiction and the jurisdiction of the party being called.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">If the other party does not consent to recording, Elena will continue the call without recording.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Call recordings are treated as health data and are subject to the same protections described in our{" "}
              <Link href="/privacy-policy" className="text-[#2E6BB5] hover:underline">Privacy Policy</Link>.
            </li>
          </ul>

          {/* 7. Health Data and Consent */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Health Data and Consent</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena collects and processes health-related data to provide the Service. By using Elena, you provide separate, affirmative consent for the collection, processing, and storage of your health data. This consent is provided in accordance with the Washington My Health My Data Act (RCW 19.373) and the Connecticut Data Privacy Act, where applicable.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Health data collected and processed by Elena includes, but is not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical conditions and health history you provide</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medications and prescriptions</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Insurance information and coverage details</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Appointment details and scheduling information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical bills, explanation of benefits, and related financial documents</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Documents you upload, including lab results, imaging reports, and other medical records</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Information obtained during calls placed on your behalf</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            You may withdraw your consent to the collection and processing of health data at any time by contacting us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>. Please note that withdrawing consent may limit or prevent your ability to use certain features of the Service.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            For full details on how we collect, use, store, and protect your data, please review our{" "}
            <Link href="/privacy-policy" className="text-[#2E6BB5] hover:underline">Privacy Policy</Link>.
          </p>

          {/* 8. Artificial Intelligence Processing */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Artificial Intelligence Processing</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena uses artificial intelligence systems, including large language models provided by Anthropic, to process your requests and deliver the Service. By using Elena, you acknowledge and agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Your data, including health data, may be transmitted to and processed by third-party AI systems in order to provide the Service.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">All third-party AI processors are bound by data processing agreements that restrict their use of your data to providing the Service. Your data is not used to train AI models.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">AI-generated responses may contain errors or inaccuracies. You should verify important information independently.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">AI-generated responses are not medical advice, legal advice, or financial advice.</li>
          </ul>

          {/* 9. User Responsibilities */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">User Responsibilities</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            You are responsible for:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Providing accurate and truthful information to Elena, including personal details, insurance information, and health data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Maintaining the confidentiality and security of your account credentials</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Ensuring that any information or documents you upload belong to you or that you have permission to share them</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Reviewing and verifying information provided by Elena before making healthcare or financial decisions</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Using the Service in compliance with all applicable laws and regulations</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Not using the Service for any unlawful, fraudulent, or harmful purpose</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Not attempting to reverse-engineer, modify, or interfere with the operation of the Service</li>
          </ul>

          {/* 10. Uploaded Documents */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Uploaded Documents</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena allows you to upload documents such as medical bills, insurance cards, explanation of benefits, lab results, and other healthcare-related files. By uploading documents to Elena, you agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You retain ownership of all documents you upload.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You grant Elena a non-exclusive, limited license to process, store, analyze, and use your uploaded documents solely for the purpose of providing the Service to you.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">You are responsible for ensuring that you have the legal right to upload any documents you provide. Do not upload documents belonging to others without proper authorization.</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">If you delete your account, your uploaded documents will be deleted in accordance with our{" "}
              <Link href="/privacy-policy" className="text-[#2E6BB5] hover:underline">Privacy Policy</Link>.
            </li>
          </ul>

          {/* 11. Subscriptions and Payment */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Subscriptions and Payment</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Some features of Elena may require a paid subscription. Pricing, billing terms, and included features will be presented within the app before any purchase.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Subscriptions automatically renew at the end of each billing cycle unless canceled through your account settings or app store subscription management. You are responsible for managing your subscription and canceling before the renewal date if you wish to avoid being charged for the next billing period.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Refund requests are handled in accordance with the policies of the applicable app store (Apple App Store or Google Play Store).
          </p>

          {/* 12. Limitation of Liability */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Limitation of Liability</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            The Service is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis, without warranties of any kind, whether express or implied. To the fullest extent permitted by applicable law, Elena AI, Inc. and its officers, directors, employees, and agents disclaim all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            To the fullest extent permitted by law, Elena AI, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service. This includes, but is not limited to, liability for:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical decisions made by users based on information provided by Elena</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Errors, inaccuracies, or omissions in AI-generated information, cost estimates, or recommendations</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">The outcome of any phone call or communication placed by Elena on your behalf</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Inaccuracies in insurance coverage verification or eligibility information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Differences between cost estimates provided by Elena and actual billed amounts</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Errors in provider pricing, availability, or network status</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Service interruptions, data loss, or technical errors</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            In no event shall Elena AI, Inc.&apos;s total aggregate liability exceed the amount you paid to Elena in the twelve (12) months preceding the event giving rise to the claim.
          </p>

          {/* 13. HIPAA Disclosure */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">HIPAA Disclosure</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena AI, Inc. is not a HIPAA-covered entity and is not a business associate as defined under the Health Insurance Portability and Accountability Act of 1996 (HIPAA). Elena does not provide healthcare treatment, payment processing for healthcare services, or healthcare operations as defined by HIPAA.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            While Elena voluntarily implements security practices aligned with industry standards, including encryption and access controls, this does not create any HIPAA obligations or establish a HIPAA-covered relationship between Elena and its users.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            For details on how we protect your data, please review our{" "}
            <Link href="/privacy-policy" className="text-[#2E6BB5] hover:underline">Privacy Policy</Link>.
          </p>

          {/* 14. Termination */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Termination</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We may suspend or terminate your account at any time if you violate these Terms, misuse the Service, or engage in conduct that we reasonably believe is harmful to Elena, other users, or third parties.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            You may delete your account at any time through the app or by contacting us at{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>. Upon account deletion, your data will be handled in accordance with our{" "}
            <Link href="/privacy-policy" className="text-[#2E6BB5] hover:underline">Privacy Policy</Link>.
          </p>

          {/* 15. Governing Law */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Governing Law</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of laws provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the state and federal courts located in the State of New York.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Nothing in these Terms shall be construed to limit any rights or remedies available to you under applicable state law, including the private right of action under the Washington My Health My Data Act (RCW 19.373) or similar state consumer health data protection statutes.
          </p>

          {/* 16. Changes to Terms */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Changes to Terms</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We may update these Terms periodically. When we make material changes, we will notify you through the app or by email. The &quot;Last Updated&quot; date at the top of this page will be revised accordingly.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Your continued use of Elena after the effective date of any changes constitutes your acceptance of the updated Terms. If you do not agree to the revised Terms, you must stop using the Service and delete your account.
          </p>

          {/* 17. Contact */}
          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Contact</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-1">
            Elena AI, Inc.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-1">
            Email:{" "}
            <a href="mailto:support@elena.health" className="text-[#2E6BB5] hover:underline">support@elena.health</a>
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
