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
    <div className="min-h-dvh bg-[#F7F6F2] font-[family-name:var(--font-inter)]">
      {/* Hero */}
      <div
        className="relative px-6 pt-20 pb-16 text-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F1B3D 0%, #1A3A6E 30%, #2E6BB5 60%, #2E6BB5 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 85% 130%, #F4B084 0%, #E8956D 25%, rgba(46,107,181,0) 60%)",
          }}
        />
        <div className="relative z-10">
          <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-light leading-[1.15] tracking-tight text-white">
            How can we{" "}
            <em className="italic font-normal font-[family-name:var(--font-dm-serif)] text-[#F4B084]">
              help?
            </em>
          </h1>
          <p className="text-[1.05rem] font-light text-white/70 mt-3">
            Find answers or reach out to our team.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[720px] px-6 py-12 space-y-16">
        {/* Contact */}
        <section>
          <h2 className="text-[20px] font-extrabold text-[#0F1B3D] mb-4">Contact Us</h2>
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(15,27,61,0.06)]">
            <p className="text-[15px] leading-[1.7] text-[#3C3C43]">
              Have a question, issue, or feedback? Reach out and we'll get back to you as soon as possible.
            </p>
            <a
              href="mailto:support@elena-health.com"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0F1B3D] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#0F1B3D]/90 transition-colors"
            >
              Email support@elena-health.com
            </a>
          </div>
        </section>

        {/* How Elena Works */}
        <section>
          <h2 className="text-[20px] font-extrabold text-[#0F1B3D] mb-4">How Elena Works</h2>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex gap-4 rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(15,27,61,0.06)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F1B3D]/[0.06] text-[15px] font-bold text-[#0F1B3D]">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1C1C1E]">{step.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-[#8E8E93] mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-[20px] font-extrabold text-[#0F1B3D] mb-4">Frequently Asked Questions</h2>
          <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(15,27,61,0.06)] overflow-hidden">
            {FAQS.map((faq, i) => (
              <div key={i}>
                {i > 0 && <div className="h-px bg-[#E5E5EA] mx-5" />}
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[15px] font-semibold text-[#1C1C1E] hover:bg-[#0F1B3D]/[0.02] transition-colors list-none [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <svg
                      className="h-4 w-4 shrink-0 text-[#AEAEB2] transition-transform group-open:rotate-180"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-[14px] leading-[1.6] text-[#8E8E93]">
                    {faq.a}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>

        {/* Back to home */}
        <div className="text-center pb-8">
          <a
            href="/"
            className="text-[14px] font-medium text-[#0F1B3D]/50 hover:text-[#0F1B3D] transition-colors"
          >
            Back to Elena
          </a>
        </div>
      </div>
    </div>
  );
}
