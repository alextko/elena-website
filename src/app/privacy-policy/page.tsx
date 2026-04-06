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
            Last Updated: March 13, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 py-20 px-8 max-md:py-14 max-md:px-5 bg-white">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Elena is a healthcare navigation tool designed to help individuals manage appointments, insurance information, medical bills, medications, and other healthcare logistics.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-6">
            Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Information We Collect</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">When you use Elena, you may choose to provide:</p>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Account Information</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Name</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Email address</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Phone number</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Profile photo</li>
          </ul>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Health and Healthcare Information</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical conditions</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medications</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Healthcare providers</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Appointment information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Insurance information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical bills or cost data</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Notes or recordings from medical visits</li>
          </ul>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Uploaded Documents</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Insurance card photos</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Medical bills</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Other healthcare documents you choose to upload</li>
          </ul>

          <h3 className="text-[17px] font-bold text-[#0F1B3D] mt-8 mb-3">Device and Usage Data</h3>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">App usage activity</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Device type and operating system</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Diagnostic and crash information</li>
          </ul>

          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">You control what health information you choose to provide.</p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">How We Use Information</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Provide Elena&apos;s healthcare navigation features</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Schedule or manage appointments on your behalf</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Help estimate healthcare costs</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Help track and organize your medical information</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Process and store healthcare documents</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Improve the performance and reliability of the app</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Provide customer support</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            Some information may be processed by automated systems or artificial intelligence to help perform these tasks.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Data Sharing</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">We do not sell personal or health information.</p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">
            We may share limited information with service providers that help operate the app, such as:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Secure cloud hosting providers</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Analytics services</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">AI processing services</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Communication services used to place calls or send messages on your behalf</li>
          </ul>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            These providers are required to protect your data and only use it to provide services to Elena.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Data Security</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We use reasonable administrative, technical, and physical safeguards designed to protect your information.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">However, no system can be guaranteed to be completely secure.</p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Data Retention</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We retain your information as long as your account is active or as necessary to provide the service.
          </p>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">You may request deletion of your account and associated data at any time.</p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Your Choices</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-3">You may:</p>
          <ul className="list-disc pl-6 space-y-1.5 mb-4">
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Update or correct information in your account</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Delete uploaded documents</li>
            <li className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">Request deletion of your account</li>
          </ul>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Children&apos;s Privacy</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">Elena is not intended for individuals under the age of 13.</p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Changes to This Policy</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8] mb-4">
            We may update this Privacy Policy from time to time. Updates will be reflected by the revised date above.
          </p>

          <h2 className="text-[22px] font-extrabold text-[#0F1B3D] mt-12 mb-4">Contact</h2>
          <p className="text-[1.05rem] font-light text-[#5a6a82] leading-[1.8]">
            If you have questions about this Privacy Policy, contact us at{" "}
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
