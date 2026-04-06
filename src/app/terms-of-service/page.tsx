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
            Last Updated: March 13, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 bg-white">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-6">By using Elena, you agree to these Terms.</p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Service Description</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena is a digital healthcare navigation tool that helps users manage healthcare logistics such as scheduling appointments, organizing medical information, estimating costs, and managing healthcare tasks.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena may automate certain actions, such as placing phone calls to healthcare providers or assisting with administrative healthcare tasks.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Not Medical Advice</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">Elena does not provide medical advice, diagnosis, or treatment.</p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Information provided through the app is for organizational and informational purposes only and should not replace consultation with qualified healthcare professionals.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">User Responsibilities</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">You are responsible for:</p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Providing accurate information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Maintaining the confidentiality of your account</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Ensuring any information you upload belongs to you or you have permission to share it</li>
          </ul>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Automated Actions</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Certain features may allow Elena to place calls or communicate with healthcare providers on your behalf. By using these features, you authorize Elena to perform these actions as directed by you.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Subscriptions</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Some features may require a paid subscription. Pricing and billing terms will be presented within the app before purchase.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Subscriptions automatically renew unless canceled through your account settings.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Limitation of Liability</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">Elena is provided on an &quot;as-is&quot; basis.</p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            To the fullest extent permitted by law, Elena and its operators are not liable for:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical decisions made by users</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Errors in provider pricing or availability</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Outcomes related to healthcare services</li>
          </ul>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Termination</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We may suspend or terminate accounts that violate these Terms or misuse the service.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">Users may delete their account at any time.</p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Changes to Terms</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We may update these Terms periodically. Continued use of Elena after changes indicates acceptance of the updated Terms.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Contact</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">
            For questions regarding these Terms, contact us at{" "}
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
