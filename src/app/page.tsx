"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LandingPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router.replace("/chat");
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F1B3D] border-t-transparent" />
      </div>
    );
  }

  if (session) return null; // redirecting

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/images/elena-icon-cropped.png"
            alt="Elena"
            className="h-10 w-10 rounded-xl"
          />
          <span className="text-xl font-semibold tracking-tight">elena</span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 border border-white/15"
        >
          Login
        </button>
      </nav>

      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Put healthcare on{" "}
          <span className="bg-gradient-to-r from-blue-400 to-orange-300 bg-clip-text text-transparent">
            autopilot
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/50">
          Elena calls doctors, negotiates bills, compares drug prices, and manages
          your entire medical life — so you don&apos;t have to.
        </p>
        <div className="mt-10 flex gap-4">
          <button
            onClick={() => router.push("/login")}
            className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#0a0a0a] transition-all hover:bg-white/90"
          >
            Get Started
          </button>
          <a
            href="#features"
            className="rounded-full border border-white/15 bg-white/5 px-8 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
          >
            Learn More
          </a>
        </div>
      </div>

      {/* Features section anchor */}
      <div id="features" className="px-8 pb-20 pt-10">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            {
              title: "Calls for you",
              desc: "Elena handles phone calls to doctors, insurance, and pharmacies.",
            },
            {
              title: "Finds cheap meds",
              desc: "Compare drug prices across pharmacies and transfer prescriptions.",
            },
            {
              title: "Negotiates bills",
              desc: "AI-powered bill analysis and negotiation to save you money.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm"
            >
              <h3 className="text-base font-semibold text-white/90">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
