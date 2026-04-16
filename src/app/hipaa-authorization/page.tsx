import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HIPAA Authorization & Authorized Representative Designation | Elena",
  description: "HIPAA authorization and authorized representative designation for Elena Health services.",
};

export default function HipaaAuthorizationPage() {
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
            HIPAA{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">Authorization</em>
          </h1>
          <p className="text-[1.15rem] font-light text-white/85 mt-4 tracking-wide">
            Authorization for Use and Disclosure of Health Information &amp; Authorized Representative Designation
          </p>
          <p className="text-[0.95rem] font-light text-white/60 mt-2 tracking-wide">
            Last Updated: April 16, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-[780px] mx-auto px-6 py-16 text-[#0F1B3D]">
        <div className="space-y-10 text-[0.95rem] leading-[1.8]">

          {/* Part 1 */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Part 1: HIPAA Authorization for Use and Disclosure of Protected Health Information</h2>

            <h3 className="text-lg font-semibold mt-6 mb-2">1. Authorized Party</h3>
            <p>
              I authorize Elena Health, Inc., and its employees, agents, AI systems, and contractors
              (&ldquo;Elena&rdquo; or &ldquo;Authorized Party&rdquo;) to access, use, and disclose my
              protected health information (&ldquo;PHI&rdquo;) as described below.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">2. Purpose of Authorization</h3>
            <p>This authorization allows Elena to assist me with healthcare navigation, including but not limited to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Contacting health insurance companies on my behalf</li>
              <li>Verifying benefits, eligibility, and coverage details</li>
              <li>Requesting cost estimates and pricing information</li>
              <li>Assisting with claims, billing inquiries, and payment issues</li>
              <li>Filing appeals or grievances with insurers</li>
              <li>Coordinating care, appointments, and referrals</li>
              <li>Communicating with healthcare providers and pharmacies on my behalf</li>
              <li>Requesting and reviewing medical records relevant to the above services</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">3. Information to Be Disclosed</h3>
            <p>I authorize the disclosure of the following protected health information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Insurance coverage, benefits, and eligibility information</li>
              <li>Claims, billing, and payment records</li>
              <li>Medical records relevant to insurance, billing, and care coordination</li>
              <li>Prescription and pharmacy information</li>
              <li>Appointment and scheduling information</li>
              <li>Any other information necessary to fulfill the purposes listed above</li>
            </ul>
            <p className="mt-3 text-[0.9rem] text-gray-600 italic">
              Note: This may include sensitive information such as mental health records, reproductive health
              information, HIV/AIDS status, or substance use treatment information, to the extent permitted
              by applicable federal and state law.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">4. Entities Authorized to Disclose Information</h3>
            <p>This authorization applies to disclosures by:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Health insurance companies, health plans, and payers</li>
              <li>Healthcare providers (physicians, hospitals, clinics, laboratories)</li>
              <li>Pharmacies and pharmacy benefit managers</li>
              <li>Billing companies, collection agencies, and other related entities</li>
              <li>Government health programs (Medicare, Medicaid) as applicable</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">5. Expiration</h3>
            <p>
              This authorization shall remain in effect for <strong>one (1) year</strong> from the date
              of my electronic signature, unless I revoke it earlier in writing.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">6. Right to Revoke</h3>
            <p>
              I understand that I may revoke this authorization at any time by submitting a written request
              to Elena Health, Inc. at{" "}
              <a href="mailto:support@elena-health.com" className="text-blue-600 underline">support@elena-health.com</a>.
              Revocation will not apply to information already disclosed or actions already taken in reliance
              on this authorization prior to receipt of my revocation request.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">7. Redisclosure Notice</h3>
            <p>
              I understand that information disclosed pursuant to this authorization may no longer be protected
              by federal privacy regulations (specifically, the HIPAA Privacy Rule, 45 CFR Part 164) and could
              be subject to redisclosure by the recipient. However, Elena Health, Inc. maintains strict data
              security practices and will not sell, share, or disclose my information except as necessary to
              fulfill the purposes described in this authorization or as required by law.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">8. Voluntary Nature of Authorization</h3>
            <p>I understand that:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>I am not required to sign this authorization</li>
              <li>My healthcare, payment, enrollment, or eligibility for benefits will not be conditioned on whether I sign this form</li>
              <li>If I do not sign, Elena may not be able to contact healthcare providers, insurers, or other third parties on my behalf</li>
            </ul>
          </div>

          {/* Part 2 */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Part 2: Authorized Representative Designation</h2>

            <h3 className="text-lg font-semibold mt-6 mb-2">9. Designation of Authorized Representative</h3>
            <p>
              I hereby designate Elena Health, Inc., and its employees, agents, AI systems, and contractors
              as my <strong>authorized representative</strong> for the purpose of interacting with my health
              plan(s), healthcare providers, pharmacies, and any other entities involved in my healthcare
              on my behalf.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">10. Scope of Authority</h3>
            <p>As my authorized representative, Elena is permitted to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Contact my health insurance plan(s) to inquire about benefits, coverage, claims, and eligibility</li>
              <li>Request, receive, and review information about my health plan on my behalf</li>
              <li>Discuss and resolve billing disputes, claims denials, and payment issues</li>
              <li>File appeals, grievances, or complaints with my health plan or regulatory bodies</li>
              <li>Schedule, reschedule, or cancel appointments with healthcare providers</li>
              <li>Request referrals, prior authorizations, and pre-certifications</li>
              <li>Coordinate prescription transfers and pharmacy services</li>
              <li>Take any other action reasonably necessary to navigate my healthcare and insurance</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">11. Duration</h3>
            <p>
              This designation as authorized representative shall remain in effect for <strong>one (1) year</strong> from
              the date of my electronic signature, or until I revoke it in writing, whichever occurs first.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-2">12. Revocation</h3>
            <p>
              I may revoke this designation at any time by contacting Elena Health, Inc. at{" "}
              <a href="mailto:support@elena-health.com" className="text-blue-600 underline">support@elena-health.com</a>.
              Revocation will take effect upon receipt and will not affect actions already taken under this designation.
            </p>
          </div>

          {/* Part 3 */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Part 3: Electronic Signature &amp; Consent</h2>

            <h3 className="text-lg font-semibold mt-6 mb-2">13. Electronic Signature</h3>
            <p>
              By typing my full legal name and tapping &ldquo;I Authorize Elena&rdquo; in the Elena mobile
              application or web application, I acknowledge that:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>My electronic signature constitutes a valid and binding signature under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. &sect; 7001 et seq.) and applicable state laws</li>
              <li>I have read and understand the terms of this HIPAA Authorization and Authorized Representative Designation</li>
              <li>I am the patient named in my Elena account, or I am the legal guardian or personal representative of the patient and have the authority to sign on their behalf</li>
              <li>I voluntarily consent to this authorization and designation</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">14. Record of Authorization</h3>
            <p>
              Elena Health, Inc. will maintain a record of my authorization, including my typed name,
              the date and time of signing, my account information (name, date of birth, email), and
              the version of this authorization I agreed to. I may request a copy of my signed authorization
              at any time by contacting{" "}
              <a href="mailto:support@elena-health.com" className="text-blue-600 underline">support@elena-health.com</a>.
            </p>
          </div>

          {/* Contact */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
            <p>For questions about this authorization or to submit a revocation request:</p>
            <div className="mt-3 space-y-1">
              <p><strong>Elena Health, Inc.</strong></p>
              <p>Email: <a href="mailto:support@elena-health.com" className="text-blue-600 underline">support@elena-health.com</a></p>
              <p>Website: <a href="https://elena-health.com" className="text-blue-600 underline">elena-health.com</a></p>
            </div>
          </div>

          {/* Back link */}
          <div className="pt-4">
            <Link href="/" className="text-blue-600 underline text-sm">
              &larr; Back to Elena
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
