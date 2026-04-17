"use client";

import { useReducer, useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { apiFetch } from "@/lib/apiFetch";
import * as analytics from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressBar } from "../risk-assessment/components/progress-bar";
import { StepLayout } from "../risk-assessment/components/step-layout";
import { OptionButton } from "../risk-assessment/components/option-button";
import { Interstitial } from "../risk-assessment/components/interstitial";
import {
  INITIAL_DME_ANSWERS,
  DME_EQUIPMENT_OPTIONS,
  TOTAL_QUESTION_STEPS,
  US_STATES,
  INSURANCE_PROVIDERS,
} from "./lib/types";
import type { DmeAnswers, DmeStep } from "./lib/types";

// Step map:
// 0: Intro, 1: Equipment, 2: Patient Identity, 3: Shipping Address,
// 4: Insurance, 5: Medical, 6: Provider, 7: Delivery,
// 8: Teaser (auth gate), 9: Confirmation

// --- Animation variants (same as risk-assessment) ---

const variants = {
  enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
};

// --- Reducer ---

interface State {
  step: DmeStep;
  answers: DmeAnswers;
  direction: 1 | -1;
}

type Action =
  | { type: "SET_ANSWER"; payload: Partial<DmeAnswers> }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: DmeStep };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, ...action.payload } };
    case "NEXT_STEP":
      return { ...state, step: Math.min(state.step + 1, 11) as DmeStep, direction: 1 };
    case "PREV_STEP":
      return { ...state, step: Math.max(state.step - 1, 0) as DmeStep, direction: -1 };
    case "GO_TO_STEP":
      return { ...state, step: action.payload, direction: action.payload > state.step ? 1 : -1 };
    default:
      return state;
  }
}

// --- Validation ---

const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v: string) => !v || /^[\d()+\-.\s]{7,}$/.test(v);
const isValidZip = (v: string) => !v || /^\d{5}$/.test(v);
const isValidDob = (v: string) => {
  if (!v) return true;
  const d = new Date(v + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (d > now) return false; // not in the future
  const age = now.getFullYear() - d.getFullYear();
  return age <= 120;
};
const errorCls = "text-[12px] text-red-500 mt-1";

// --- Shared input style ---

const inputCls =
  "w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors";
const selectCls =
  `${inputCls} appearance-none pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat`;
const labelCls = "text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1 block";

// --- Main Component ---

function DmeContent() {
  const router = useRouter();
  const { session, profileId, profileData } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const prevSession = useRef(session);
  const savedRef = useRef(false);

  const [state, dispatch] = useReducer(reducer, {
    step: 0 as DmeStep,
    answers: { ...INITIAL_DME_ANSWERS },
    direction: 1 as const,
  });

  // Restore from sessionStorage
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = sessionStorage.getItem("elena_dme_answers");
    const savedStep = sessionStorage.getItem("elena_dme_step");
    if (saved) {
      try {
        dispatch({ type: "SET_ANSWER", payload: JSON.parse(saved) });
        if (savedStep) dispatch({ type: "GO_TO_STEP", payload: parseInt(savedStep, 10) as DmeStep });
      } catch {}
    }
  }, []);

  // Track page view
  const hasTracked = useRef(false);
  useEffect(() => {
    if (!hasTracked.current) {
      hasTracked.current = true;
      analytics.track("DME Quiz Page Viewed" as any);
    }
  }, []);

  const { step, answers, direction } = state;

  const setAnswer = useCallback((data: Partial<DmeAnswers>) => {
    dispatch({ type: "SET_ANSWER", payload: data });
  }, []);

  const advance = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    if (step > 0 && step < 11) {
      sessionStorage.setItem("elena_dme_answers", JSON.stringify(answers));
      sessionStorage.setItem("elena_dme_step", String(step));
    }
  }, [answers, step]);

  // Track step changes
  const prevStep = useRef(step);
  useEffect(() => {
    if (step === prevStep.current) return;
    prevStep.current = step;
    if (step === 1) analytics.track("DME Quiz Started" as any);
    else if (step > 0 && step < 10 && step !== 2 && step !== 9) analytics.track("DME Quiz Step Completed" as any, { step });
    else if (step === 10) analytics.track("DME Quiz Gate Shown" as any);
  }, [step]);

  // Save anonymously when user reaches the teaser (step 10)
  const anonymousSaveRef = useRef(false);
  useEffect(() => {
    if (step !== 10 || anonymousSaveRef.current || session) return;
    anonymousSaveRef.current = true;
    // Fire-and-forget anonymous save
    apiFetch("/dme/intake/anonymous", {
      method: "POST",
      body: JSON.stringify({
        patient_first_name: answers.firstName,
        patient_last_name: answers.lastName,
        patient_dob: answers.dob,
        patient_phone: answers.phone,
        patient_email: answers.email,
        shipping_street: answers.shippingStreet,
        shipping_apt: answers.shippingApt,
        shipping_city: answers.shippingCity,
        shipping_state: answers.shippingState,
        shipping_zip: answers.shippingZip,
        insurance_provider: answers.insuranceProvider,
        insurance_member_id: answers.insuranceMemberId,
        insurance_group_number: answers.insuranceGroupNumber,
        insurance_plan_type: answers.insurancePlanType,
        insurance_zip: answers.insuranceZip,
        equipment_type: answers.equipmentType,
        urgency: answers.urgency || "routine",
        equipment_notes: answers.equipmentNotes,
        has_diagnosis: answers.hasDiagnosis === true,
        condition_description: answers.conditionDescription,
        has_prescription: answers.hasPrescription === true,
        prescribing_doctor_name: answers.prescribingDoctorName,
        prescribing_doctor_phone: answers.prescribingDoctorPhone,
        doctor_clinic_name: answers.doctorClinicName,
        doctor_phone: answers.doctorPhone,
        doctor_fax: answers.doctorFax,
        delivery_timing: answers.deliveryTiming || "flexible",
        mobility_issues: answers.mobilityIssues === true,
        access_notes: answers.accessNotes,
        source: "web_quiz",
      }),
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.intake_id) sessionStorage.setItem("elena_dme_intake_id", data.intake_id);
      }
    }).catch(() => {});
  }, [step, session, answers]);

  // After signup at teaser, claim the anonymous intake and advance to confirmation
  useEffect(() => {
    if (!prevSession.current && session && step === 10 && !savedRef.current) {
      savedRef.current = true;
      // Claim the anonymous intake
      const intakeId = sessionStorage.getItem("elena_dme_intake_id");
      if (intakeId) {
        apiFetch(`/dme/intake/${intakeId}/claim`, { method: "POST" }).catch(() => {});
      }
      dispatch({ type: "GO_TO_STEP", payload: 11 });
    }
    prevSession.current = session;
  }, [session, step]);

  // Pre-fill from profile when authenticated
  const prefilled = useRef(false);
  useEffect(() => {
    if (!profileData || prefilled.current) return;
    prefilled.current = true;
    const updates: Partial<DmeAnswers> = {};
    if (profileData.firstName && !answers.firstName) updates.firstName = profileData.firstName;
    if (profileData.lastName && !answers.lastName) updates.lastName = profileData.lastName;
    if (profileData.email && !answers.email) updates.email = profileData.email;
    if (Object.keys(updates).length > 0) setAnswer(updates);
  }, [profileData, answers, setAnswer]);

  const handleSignup = useCallback(() => {
    analytics.registerOnce({ acquisition_source: "dme_quiz" });
    analytics.setPeopleProperties({ acquisition_source: "dme_quiz" });
    sessionStorage.setItem("elena_dme_answers", JSON.stringify(answers));
    setAuthModalOpen(true);
  }, [answers]);

  const handleSubmit = useCallback(async () => {
    if (!profileId) return;
    try {
      await apiFetch("/dme/intake", {
        method: "POST",
        body: JSON.stringify({
          patient_first_name: answers.firstName,
          patient_last_name: answers.lastName,
          patient_dob: answers.dob,
          patient_phone: answers.phone,
          patient_email: answers.email,
          shipping_street: answers.shippingStreet,
          shipping_apt: answers.shippingApt,
          shipping_city: answers.shippingCity,
          shipping_state: answers.shippingState,
          shipping_zip: answers.shippingZip,
          insurance_provider: answers.insuranceProvider,
          insurance_member_id: answers.insuranceMemberId,
          insurance_group_number: answers.insuranceGroupNumber,
          insurance_plan_type: answers.insurancePlanType,
          insurance_zip: answers.insuranceZip,
          equipment_type: answers.equipmentType,
          urgency: answers.urgency || "routine",
          equipment_notes: answers.equipmentNotes,
          has_diagnosis: answers.hasDiagnosis === true,
          condition_description: answers.conditionDescription,
          has_prescription: answers.hasPrescription === true,
          prescribing_doctor_name: answers.prescribingDoctorName,
          prescribing_doctor_phone: answers.prescribingDoctorPhone,
          doctor_clinic_name: answers.doctorClinicName,
          doctor_phone: answers.doctorPhone,
          doctor_fax: answers.doctorFax,
          delivery_timing: answers.deliveryTiming || "flexible",
          mobility_issues: answers.mobilityIssues === true,
          access_notes: answers.accessNotes,
          source: "web_quiz",
        }),
      });
      analytics.track("DME Quiz Submitted" as any, { equipment_type: answers.equipmentType });
    } catch {}

    // Clear session storage
    sessionStorage.removeItem("elena_dme_answers");
    sessionStorage.removeItem("elena_dme_step");

    // Signal the chat page to ask the backend for an intake-aware welcome.
    // The intake is already persisted to dme_intakes and will surface in the
    // agent's system prompt via _build_submissions_context, so we don't need
    // to resend a synthetic query as the user's first message.
    localStorage.setItem("elena_post_intake_submit", "dme");
    // Clear any stale pending query from earlier funnels so it doesn't
    // accidentally auto-send into the welcome session.
    localStorage.removeItem("elena_pending_query");
    router.push("/chat");
  }, [answers, profileId, router]);

  // --- Shell ---

  const isIntro = step === 0;
  const isInterstitial = step === 2 || step === 9;
  const isTeaser = step === 10;
  const isConfirm = step === 11;
  const showProgress = !isIntro && !isInterstitial && !isTeaser && !isConfirm;

  return (
    <div className="min-h-dvh flex flex-col font-[family-name:var(--font-inter)] bg-[#F7F6F2]">
      {showProgress && (
        <ProgressBar step={step} totalSteps={TOTAL_QUESTION_STEPS} onBack={goBack} showBack={step >= 1} />
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 flex flex-col"
        >
          {/* ── Step 0: Intro (matches risk-assessment style) ── */}
          {step === 0 && (
            <section className="relative flex-1 min-h-dvh flex flex-col items-center overflow-hidden">
              <style dangerouslySetInnerHTML={{ __html: `@keyframes scroll-left{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}` }} />
              {/* Gradient bg */}
              <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_130%,#F4B084_0%,#E8956D_25%,rgba(46,107,181,0)_60%)]" />
              </div>

              {/* Blobs */}
              <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
                <div className="absolute rounded-full blur-[80px] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(46,107,181,0.5)_0%,transparent_70%)] -top-[10%] left-[20%]" />
                <div className="absolute rounded-full blur-[80px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(244,176,132,0.35)_0%,transparent_70%)] -bottom-[20%] -right-[5%]" />
                <div className="absolute rounded-full blur-[80px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(26,58,110,0.4)_0%,transparent_70%)] top-[30%] right-[25%]" />
                <div className="absolute rounded-full blur-[80px] w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(232,149,109,0.25)_0%,transparent_70%)] bottom-[10%] left-[5%]" />
              </div>

              {/* Nav */}
              <nav className="absolute top-0 left-0 right-0 z-[100] px-8 py-5 flex items-center justify-between max-md:px-4">
                <a
                  href="/"
                  className="bg-white/[0.08] backdrop-blur-[40px] border border-white/[0.18] border-t-white/30 rounded-[18px_18px_18px_4px] px-5 py-2.5 max-md:px-4 max-md:py-2 max-md:h-10 max-md:flex max-md:items-center text-[1.35rem] max-md:text-[0.95rem] font-semibold text-white no-underline tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
                >
                  elena
                </a>
              </nav>

              {/* Content */}
              <div className="relative z-[4] text-center max-w-[700px] w-full px-6 mt-[20vh] max-md:mt-[15vh]">
                <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] max-md:text-[1.7rem] font-light leading-[1.15] tracking-tight text-white">
                  Need at-home<br />
                  <span className="font-extrabold">medical equipment?</span>
                </h1>

                <p className="text-[0.95rem] max-md:text-[0.8rem] font-light text-white/85 mt-4 tracking-wide max-w-[520px] mx-auto">
                  Elena checks your insurance, finds the best price from in-network suppliers, and gets it delivered to your door.
                </p>

                <p className="text-white/40 text-[13px] font-light mt-3">
                  CPAP machines, breast pumps, oxygen tanks, braces & more
                </p>

                <button
                  type="button"
                  onClick={advance}
                  className="mt-8 px-10 py-4 rounded-full bg-white/[0.12] backdrop-blur-[40px] border border-white/[0.2] border-t-white/30 text-white font-semibold text-base shadow-[0_4px_24px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-white/[0.2] hover:border-white/[0.35] transition-all"
                  style={{ WebkitBackdropFilter: "blur(40px) saturate(1.8)" }}
                >
                  Get Started
                </button>

                <p className="text-white/30 text-xs mt-5 font-light">
                  Free. Most equipment covered at $0 under your plan.
                </p>
              </div>

              {/* Testimonials */}
              <div className="absolute bottom-0 left-0 right-0 z-[2] w-full pb-3 max-md:pb-2" style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
              }}>
                <div className="text-[11px] font-semibold uppercase tracking-[2px] text-white/30 text-center mb-4">
                  Real people. Real results.
                </div>
                <div className="overflow-hidden w-full">
                  <div className="flex w-max animate-[scroll-left_100s_linear_infinite] max-md:animate-[scroll-left_60s_linear_infinite] will-change-transform [backface-visibility:hidden]">
                    {[0, 1].map((set) => (
                      <div key={set} className="flex gap-3 pr-3 shrink-0">
                        {[
                          { name: "Jessica", text: <><span className="font-bold">Jessica</span> was quoted <span className="font-bold">$380</span> for a breast pump. Elena found one fully covered by insurance.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
                          { name: "Michael", text: <><span className="font-bold">Michael</span> got his CPAP machine covered at <span className="font-bold">100%</span> after Elena verified his benefits.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
                          { name: "Sarah", text: <><span className="font-bold">Sarah</span> saved <span className="font-bold">$2,800</span> on her oxygen concentrator through an in-network DME supplier.</>, logo: "/images/insurers/aetna.svg", logoAlt: "Aetna" },
                          { name: "David", text: <><span className="font-bold">David</span> needed a knee brace — Elena found one covered with just a <span className="font-bold">$32 copay</span>.</>, logo: "/images/insurers/cigna.svg", logoAlt: "Cigna" },
                          { name: "Lisa", text: <><span className="font-bold">Lisa</span> didn&apos;t know her plan covered a hospital-grade breast pump. Elena got it delivered free.</>, logo: "/images/insurers/humana.svg", logoAlt: "Humana" },
                          { name: "Tom", text: <><span className="font-bold">Tom</span> got his CPAP supplies on auto-delivery, fully covered. Elena handled everything.</>, logo: "/images/insurers/oscar.svg", logoAlt: "Oscar" },
                          { name: "Rachel", text: <><span className="font-bold">Rachel</span> compared 4 DME suppliers and found one that ships free with <span className="font-bold">$0</span> out of pocket.</>, logo: "/images/insurers/bcbs.svg", logoAlt: "Blue Cross" },
                          { name: "James", text: <><span className="font-bold">James</span> needed a wheelchair after surgery. Elena got prior auth approved in <span className="font-bold">3 days</span>.</>, logo: "/images/insurers/uhc.svg", logoAlt: "UnitedHealthcare" },
                        ].map((card) => (
                          <div key={`${set}-${card.name}`} className="bg-white/[0.12] backdrop-blur-xl border border-white/[0.18] rounded-2xl px-6 pt-5 pb-4 w-[310px] h-[130px] shrink-0 shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col">
                            <p className="text-[0.88rem] text-white/90 leading-relaxed flex-1">{card.text}</p>
                            <img src={card.logo} alt={card.logoAlt} className="h-6 mt-auto pt-2 self-start brightness-0 invert opacity-60" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Step 1: Equipment ── */}
          {step === 1 && (
            <StepLayout
              question="What equipment do you need?"
              subtitle="Select the type of medical equipment you're looking for."
              ctaLabel="Continue"
              ctaEnabled={!!answers.equipmentType && (answers.equipmentType !== "Other" || !!answers.equipmentNotes.trim())}
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <select
                    value={answers.equipmentType}
                    onChange={(e) => setAnswer({ equipmentType: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Select equipment type</option>
                    {DME_EQUIPMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {answers.equipmentType === "Other" && (
                  <div>
                    <label className={labelCls}>Describe the equipment</label>
                    <input
                      type="text"
                      placeholder="e.g. Hospital bed, shower chair"
                      value={answers.equipmentNotes}
                      onChange={(e) => setAnswer({ equipmentNotes: e.target.value })}
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                )}
                <div>
                  <label className={labelCls}>How soon do you need this?</label>
                  <select
                    value={answers.urgency}
                    onChange={(e) => setAnswer({ urgency: e.target.value as DmeAnswers["urgency"] })}
                    className={selectCls}
                  >
                    <option value="">Select urgency</option>
                    <option value="urgent">Urgent / ASAP</option>
                    <option value="soon">Within a few weeks</option>
                    <option value="routine">No rush</option>
                  </select>
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 2: Interstitial ── */}
          {step === 2 && (
            <Interstitial
              headline="80% of DME is covered by insurance, but most people never file."
              detail="Wheelchairs, CPAP machines, breast pumps, and more are considered medically necessary equipment. Your plan likely covers most or all of the cost."
              source="CMS.gov"
              sourceUrl="https://www.cms.gov/medicare/coverage/durable-medical-equipment"
              onContinue={advance}
              onBack={goBack}
            />
          )}

          {/* ── Step 3: Patient Identity ── */}
          {step === 3 && (
            <StepLayout
              question="Tell us about yourself"
              subtitle="We need this to verify your insurance eligibility."
              ctaLabel="Continue"
              ctaEnabled={!!(answers.firstName && answers.lastName && isValidEmail(answers.email) && isValidPhone(answers.phone) && isValidDob(answers.dob))}
              onCta={advance}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>First name</label>
                    <input type="text" value={answers.firstName} onChange={(e) => setAnswer({ firstName: e.target.value })} placeholder="First name" className={inputCls} autoFocus />
                  </div>
                  <div>
                    <label className={labelCls}>Last name</label>
                    <input type="text" value={answers.lastName} onChange={(e) => setAnswer({ lastName: e.target.value })} placeholder="Last name" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Date of birth</label>
                  <input type="date" value={answers.dob} onChange={(e) => setAnswer({ dob: e.target.value })} className={inputCls} />
                  {answers.dob && !isValidDob(answers.dob) && <p className={errorCls}>Please enter a valid date of birth</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={answers.phone} onChange={(e) => setAnswer({ phone: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                  {answers.phone && !isValidPhone(answers.phone) && <p className={errorCls}>Please enter a valid phone number</p>}
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={answers.email} onChange={(e) => setAnswer({ email: e.target.value })} placeholder="you@email.com" className={inputCls} />
                  {answers.email && !isValidEmail(answers.email) && <p className={errorCls}>Please enter a valid email address</p>}
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 4: Shipping Address ── */}
          {step === 4 && (
            <StepLayout
              question="Where should we ship your equipment?"
              ctaLabel="Continue"
              ctaEnabled={!!(answers.shippingStreet && answers.shippingZip && isValidZip(answers.shippingZip))}
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Street address</label>
                  <input type="text" value={answers.shippingStreet} onChange={(e) => setAnswer({ shippingStreet: e.target.value })} placeholder="123 Main St" className={inputCls} autoFocus />
                </div>
                <div>
                  <label className={labelCls}>Apt / Unit</label>
                  <input type="text" value={answers.shippingApt} onChange={(e) => setAnswer({ shippingApt: e.target.value })} placeholder="Apt 4B (optional)" className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className={labelCls}>City</label>
                    <input type="text" value={answers.shippingCity} onChange={(e) => setAnswer({ shippingCity: e.target.value })} placeholder="City" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <select value={answers.shippingState} onChange={(e) => setAnswer({ shippingState: e.target.value })} className={selectCls}>
                      <option value="">--</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Zip</label>
                    <input type="text" value={answers.shippingZip} onChange={(e) => setAnswer({ shippingZip: e.target.value })} placeholder="78746" maxLength={5} inputMode="numeric" className={inputCls} />
                    {answers.shippingZip && !isValidZip(answers.shippingZip) && <p className={errorCls}>Enter a 5-digit zip code</p>}
                  </div>
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 5: Insurance ── */}
          {step === 5 && (
            <StepLayout
              question="What's your insurance information?"
              subtitle="This is critical for verifying coverage and getting your equipment approved."
              ctaLabel="Continue"
              ctaEnabled={!!(answers.insuranceProvider && answers.insuranceMemberId)}
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Insurance provider</label>
                  <select value={answers.insuranceProvider} onChange={(e) => setAnswer({ insuranceProvider: e.target.value })} className={selectCls}>
                    <option value="">Select your insurer</option>
                    {INSURANCE_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Member ID</label>
                  <input type="text" value={answers.insuranceMemberId} onChange={(e) => setAnswer({ insuranceMemberId: e.target.value })} placeholder="Found on your insurance card" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Group number <span className="normal-case font-normal text-[#AEAEB2]">(if applicable)</span></label>
                  <input type="text" value={answers.insuranceGroupNumber} onChange={(e) => setAnswer({ insuranceGroupNumber: e.target.value })} placeholder="Optional" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Plan type</label>
                  <select value={answers.insurancePlanType} onChange={(e) => setAnswer({ insurancePlanType: e.target.value })} className={selectCls}>
                    <option value="">Select if known</option>
                    <option value="HMO">HMO</option>
                    <option value="PPO">PPO</option>
                    <option value="EPO">EPO</option>
                    <option value="Medicare">Medicare</option>
                    <option value="Medicare Advantage">Medicare Advantage</option>
                    <option value="Medicaid">Medicaid</option>
                    <option value="Other">Other / Not sure</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Zip code</label>
                  <input type="text" value={answers.insuranceZip} onChange={(e) => setAnswer({ insuranceZip: e.target.value })} placeholder="For network matching" maxLength={5} inputMode="numeric" className={inputCls} />
                  {answers.insuranceZip && !isValidZip(answers.insuranceZip) && <p className={errorCls}>Enter a 5-digit zip code</p>}
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 6: Medical ── */}
          {step === 6 && (
            <StepLayout
              question="Medical information"
              subtitle="This helps us determine what documentation you'll need."
              ctaLabel="Continue"
              ctaEnabled={answers.hasDiagnosis !== null}
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Do you have a diagnosis or condition for this equipment?</label>
                  <div className="flex gap-3 mt-1">
                    <OptionButton label="Yes" selected={answers.hasDiagnosis === true} onClick={() => setAnswer({ hasDiagnosis: true })} />
                    <OptionButton label="No" selected={answers.hasDiagnosis === false} onClick={() => setAnswer({ hasDiagnosis: false })} />
                  </div>
                </div>
                {answers.hasDiagnosis && (
                  <div>
                    <label className={labelCls}>Describe your condition</label>
                    <textarea value={answers.conditionDescription} onChange={(e) => setAnswer({ conditionDescription: e.target.value })} placeholder="e.g. Sleep apnea, mobility impairment" className={`${inputCls} resize-none`} rows={3} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Do you have a prescription from a doctor?</label>
                  <div className="flex gap-3 mt-1">
                    <OptionButton label="Yes" selected={answers.hasPrescription === true} onClick={() => setAnswer({ hasPrescription: true })} />
                    <OptionButton label="No" selected={answers.hasPrescription === false} onClick={() => setAnswer({ hasPrescription: false })} />
                  </div>
                </div>
                {answers.hasPrescription && (
                  <>
                    <div>
                      <label className={labelCls}>Prescribing doctor's name</label>
                      <input type="text" value={answers.prescribingDoctorName} onChange={(e) => setAnswer({ prescribingDoctorName: e.target.value })} placeholder="Dr. Smith" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Doctor's phone</label>
                      <input type="tel" value={answers.prescribingDoctorPhone} onChange={(e) => setAnswer({ prescribingDoctorPhone: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                    </div>
                  </>
                )}
              </div>
            </StepLayout>
          )}

          {/* ── Step 7: Provider ── */}
          {step === 7 && (
            <StepLayout
              question="Your doctor or clinic"
              subtitle="We may need to contact them for paperwork."
              ctaLabel="Continue"
              ctaEnabled
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Doctor / Clinic name</label>
                  <input type="text" value={answers.doctorClinicName} onChange={(e) => setAnswer({ doctorClinicName: e.target.value })} placeholder="Name of your primary doctor or clinic" className={inputCls} autoFocus />
                </div>
                {answers.doctorClinicName !== "" && (
                  <>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input type="tel" value={answers.doctorPhone} onChange={(e) => setAnswer({ doctorPhone: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Fax <span className="normal-case font-normal text-[#AEAEB2]">(if known)</span></label>
                      <input type="tel" value={answers.doctorFax} onChange={(e) => setAnswer({ doctorFax: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setAnswer({ doctorClinicName: "", doctorPhone: "", doctorFax: "" }); advance(); }}
                  className="text-[14px] font-medium text-[#8E8E93] hover:text-[#0F1B3D] transition-colors pt-1"
                >
                  I don't have a doctor yet
                </button>
              </div>
            </StepLayout>
          )}

          {/* ── Step 8: Delivery ── */}
          {step === 8 && (
            <StepLayout
              question="Delivery details"
              subtitle="Anything we should know about getting this to you?"
              ctaLabel="Continue"
              ctaEnabled
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Any mobility or access issues at your address?</label>
                  <div className="flex gap-3 mt-1">
                    <OptionButton label="Yes" selected={answers.mobilityIssues === true} onClick={() => setAnswer({ mobilityIssues: true })} />
                    <OptionButton label="No" selected={answers.mobilityIssues === false} onClick={() => setAnswer({ mobilityIssues: false })} />
                  </div>
                </div>
                {answers.mobilityIssues && (
                  <div>
                    <label className={labelCls}>Describe (stairs, narrow doors, etc.)</label>
                    <textarea value={answers.accessNotes} onChange={(e) => setAnswer({ accessNotes: e.target.value })} placeholder="Any details that would help with delivery" className={`${inputCls} resize-none`} rows={2} />
                  </div>
                )}
              </div>
            </StepLayout>
          )}

          {/* ── Step 9: Interstitial ── */}
          {step === 9 && (
            <Interstitial
              headline="The average American overpays $1,200/year on medical equipment."
              detail="Insurance companies are required to cover medically necessary DME. Elena handles the paperwork, prior authorizations, and supplier coordination so you pay as little as possible."
              source="Kaiser Family Foundation"
              sourceUrl="https://www.kff.org/health-costs/"
              onContinue={advance}
              onBack={goBack}
            />
          )}

          {/* ── Step 10: Teaser / Auth Gate ── */}
          {step === 10 && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center"
              style={{ background: "linear-gradient(180deg, #0F1B3D 0%, #1A3A6E 50%, #2E6BB5 100%)" }}>
              <div className="max-w-md">
                <h1 className="text-[clamp(1.6rem,5vw,2.2rem)] font-light text-white leading-tight tracking-tight mb-3">
                  Your intake is <em className="font-medium not-italic">ready to submit</em>
                </h1>
                <p className="text-[16px] text-white/60 font-light leading-relaxed mb-8">
                  Create a free account to submit your request. Elena will check your coverage, handle the paperwork, and get your equipment on the way.
                </p>
                {session ? (
                  <button
                    onClick={() => dispatch({ type: "GO_TO_STEP", payload: 11 })}
                    className="w-full max-w-xs mx-auto py-4 rounded-full bg-white/[0.12] backdrop-blur-[40px] border border-white/[0.2] text-white font-semibold text-base hover:bg-white/[0.2] transition-all"
                  >
                    Review & Submit
                  </button>
                ) : (
                  <button
                    onClick={handleSignup}
                    className="w-full max-w-xs mx-auto py-4 rounded-full bg-white/[0.12] backdrop-blur-[40px] border border-white/[0.2] text-white font-semibold text-base hover:bg-white/[0.2] transition-all"
                  >
                    Create Account & Submit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 11: Confirmation ── */}
          {step === 11 && (
            <div className="flex-1 flex flex-col px-6 pt-10 pb-6 max-w-lg mx-auto w-full">
              <h2 className="text-[clamp(1.4rem,5vw,1.75rem)] font-light text-[#0F1B3D] leading-tight tracking-tight mb-6">
                Review your request
              </h2>

              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                <SummarySection title="Equipment" items={[
                  ["Type", answers.equipmentType],
                  ["Urgency", answers.urgency || "Routine"],
                  ...(answers.equipmentNotes ? [["Notes", answers.equipmentNotes] as [string, string]] : []),
                ]} />
                <SummarySection title="Patient" items={[
                  ["Name", `${answers.firstName} ${answers.lastName}`.trim()],
                  ...(answers.dob ? [["DOB", answers.dob] as [string, string]] : []),
                  ...(answers.phone ? [["Phone", answers.phone] as [string, string]] : []),
                  ...(answers.email ? [["Email", answers.email] as [string, string]] : []),
                ]} />
                <SummarySection title="Shipping" items={[
                  ["Address", [answers.shippingStreet, answers.shippingApt].filter(Boolean).join(", ")],
                  ["City/State/Zip", [answers.shippingCity, answers.shippingState, answers.shippingZip].filter(Boolean).join(", ")],
                ]} />
                <SummarySection title="Insurance" items={[
                  ["Provider", answers.insuranceProvider],
                  ["Member ID", answers.insuranceMemberId],
                  ...(answers.insuranceGroupNumber ? [["Group #", answers.insuranceGroupNumber] as [string, string]] : []),
                  ...(answers.insurancePlanType ? [["Plan Type", answers.insurancePlanType] as [string, string]] : []),
                ]} />
                <SummarySection title="Medical" items={[
                  ["Diagnosis", answers.hasDiagnosis ? "Yes" : "No"],
                  ...(answers.conditionDescription ? [["Condition", answers.conditionDescription] as [string, string]] : []),
                  ["Prescription", answers.hasPrescription ? "Yes" : "No"],
                  ...(answers.prescribingDoctorName ? [["Prescribing Dr.", answers.prescribingDoctorName] as [string, string]] : []),
                ]} />
                {(answers.doctorClinicName || answers.doctorPhone) && (
                  <SummarySection title="Provider" items={[
                    ...(answers.doctorClinicName ? [["Clinic", answers.doctorClinicName] as [string, string]] : []),
                    ...(answers.doctorPhone ? [["Phone", answers.doctorPhone] as [string, string]] : []),
                    ...(answers.doctorFax ? [["Fax", answers.doctorFax] as [string, string]] : []),
                  ]} />
                )}
              </div>

              <div className="pt-4 mt-auto">
                <button
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-full bg-[linear-gradient(135deg,#0F1B3D_0%,#1A3A6E_30%,#2E6BB5_60%,#2E6BB5_100%)] text-white font-semibold text-base hover:opacity-90 transition-all"
                >
                  Submit Request
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode="signup"
        oauthRedirectTo="/dme"
      />
    </div>
  );
}

function SummarySection({ title, items }: { title: string; items: [string, string][] }) {
  const filled = items.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4">
      <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">{title}</h3>
      {filled.map(([label, value]) => (
        <div key={label} className="flex justify-between py-1.5 border-b border-[#E5E5EA] last:border-0">
          <span className="text-[14px] text-[#8E8E93]">{label}</span>
          <span className="text-[14px] font-medium text-[#0F1B3D] text-right max-w-[60%]">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DmePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#F7F6F2]" />}>
      <DmeContent />
    </Suspense>
  );
}
