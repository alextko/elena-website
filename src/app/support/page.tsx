import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Elena",
  description: "Get help with Elena, your AI-powered healthcare assistant.",
};

const FAQS = [
  {
    q: "What is Elena?",
    a: "Elena is an AI-powered healthcare assistant that helps you navigate the healthcare system. She can schedule appointments, manage your medical records, compare drug prices, negotiate bills, and keep you on top of preventive care.",
  },
  {
    q: "How does Elena make phone calls?",
    a: "When you ask Elena to book an appointment or call a provider, she handles the call on your behalf. She uses the information in your profile (insurance, DOB, etc.) to communicate with the office, then reports back with the result.",
  },
  {
    q: "Is my health information secure?",
    a: "Yes. Your data is encrypted in transit and at rest. We never sell your data or share it with third parties for advertising. Elena only uses your information to provide you with healthcare assistance.",
  },
  {
    q: "What can Elena help me with?",
    a: "Elena can schedule and reschedule appointments, find in-network providers, compare prescription drug prices, analyze medical bills for errors, manage your medications and conditions, organize your health documents, and remind you about preventive care.",
  },
  {
    q: "Does Elena give medical advice?",
    a: "No. Elena is a healthcare navigation tool, not a medical provider. She helps with logistics like scheduling, cost comparison, and organization. For medical advice, always consult a qualified healthcare professional.",
  },
  {
    q: "How much does Elena cost?",
    a: "Elena offers a free tier with basic features. Premium plans unlock additional capabilities like unlimited phone calls, bill negotiation, and advanced document analysis. You can view pricing from within the app.",
  },
  {
    q: "Can Elena help manage care for my family?",
    a: "Yes. You can add family members to your account and Elena will help manage their healthcare too, including scheduling appointments, tracking medications, and organizing their health records.",
  },
  {
    q: "What insurance plans does Elena work with?",
    a: "Elena works with all major insurance providers. She can look up in-network providers, estimate out-of-pocket costs, and help you understand your coverage and benefits.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Chat with Elena",
    description: "Tell Elena what you need help with. Whether it's booking an appointment, understanding a bill, or finding a cheaper medication, just ask.",
  },
  {
    title: "Elena takes action",
    description: "Elena uses your profile information to take action on your behalf. She can make phone calls, search for providers, compare prices, and more.",
  },
  {
    title: "Stay on top of your health",
    description: "Elena keeps track of your appointments, medications, and to-dos. She proactively reminds you about preventive care and helps you stay organized.",
  },
];

export default function SupportPage() {
  return (
    <div className="font-[family-name:var(--font-inter)]">
      {/* Hero — matches landing page */}
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
            How can we{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">help?</em>
          </h1>
          <p className="text-[1.15rem] font-light text-white/85 mt-4 tracking-wide">
            Find answers below or reach out to our team.
          </p>
        </div>
      </section>

      {/* How Elena Works — light section matching landing */}
      <section className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 bg-white">
        <div className="mx-auto max-w-[960px]">
          <div className="text-center mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#0F1B3D]/30 mb-4">Getting started</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.15] tracking-tight text-[#0F1B3D]">
              <span className="font-extrabold">How Elena</span>{" "}
              <em className="font-normal italic font-[family-name:var(--font-dm-serif)] text-[#2E6BB5]">works.</em>
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0F1B3D]/[0.06] text-[22px] font-extrabold text-[#0F1B3D] mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="text-[18px] font-bold text-[#0F1B3D] mb-2">{step.title}</h3>
                <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — gradient section matching landing stats bar */}
      <section
        className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 40%, #2E6BB5 100%)" }}
      >
        <div className="absolute -bottom-[30%] -left-[10%] w-[60%] h-[80%] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(244,176,132,0.2) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[720px]">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 mb-4">FAQ</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.15] tracking-tight text-white">
              <span className="font-extrabold">Common</span>{" "}
              <em className="font-normal italic font-[family-name:var(--font-dm-serif)] text-[#F4B084]">questions.</em>
            </h2>
          </div>
          <div className="rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] overflow-hidden">
            {FAQS.map((faq, i) => (
              <div key={i}>
                {i > 0 && <div className="h-px bg-white/[0.08] mx-5" />}
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-[16px] font-semibold text-white hover:bg-white/[0.04] transition-colors list-none [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <svg
                      className="h-4 w-4 shrink-0 text-white/30 transition-transform group-open:rotate-180"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 text-[15px] leading-[1.7] text-white/60">
                    {faq.a}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact — light section */}
      <section className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 bg-white">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold text-[#0F1B3D] mb-3">Still need help?</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.7]">
            Reach out to us at{" "}
            <a href="mailto:support@elena-health.com" className="text-[#2E6BB5] font-medium hover:underline">
              support@elena-health.com
            </a>
          </p>
        </div>
      </section>

      {/* Footer — matches landing */}
      <footer className="relative z-10 pt-12 pb-8 px-8 text-white overflow-hidden" style={{ background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)" }}>
        <div className="relative mx-auto max-w-[960px]">
          <div className="flex justify-between items-center text-[0.78rem] text-white/30 max-md:flex-col max-md:gap-1.5 max-md:text-center">
            <a href="/" className="text-[1.35rem] font-semibold text-white no-underline tracking-tight">elena</a>
            <span>&copy; 2026 Elena AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
