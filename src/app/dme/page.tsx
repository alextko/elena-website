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
import {
  INITIAL_DME_ANSWERS,
  DME_EQUIPMENT_OPTIONS,
  TOTAL_QUESTION_STEPS,
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
      return { ...state, step: Math.min(state.step + 1, 9) as DmeStep, direction: 1 };
    case "PREV_STEP":
      return { ...state, step: Math.max(state.step - 1, 0) as DmeStep, direction: -1 };
    case "GO_TO_STEP":
      return { ...state, step: action.payload, direction: action.payload > state.step ? 1 : -1 };
    default:
      return state;
  }
}

// --- Shared input style ---

const inputCls =
  "w-full rounded-xl border border-[#E5E5EA] bg-white px-4 py-3 text-[15px] text-[#0F1B3D] outline-none placeholder:text-[#AEAEB2] focus:border-[#2E6BB5] focus:ring-1 focus:ring-[#2E6BB5] transition-colors";
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
    if (step > 0 && step < 9) {
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
    else if (step > 0 && step < 8) analytics.track("DME Quiz Step Completed" as any, { step });
    else if (step === 8) analytics.track("DME Quiz Gate Shown" as any);
  }, [step]);

  // After signup at teaser, save and advance to confirmation
  useEffect(() => {
    if (!prevSession.current && session && step === 8 && !savedRef.current) {
      savedRef.current = true;
      dispatch({ type: "GO_TO_STEP", payload: 9 });
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

    // Redirect to chat
    localStorage.setItem(
      "elena_pending_query",
      `I just submitted a DME intake form for ${answers.equipmentType}. What are the next steps to get this covered by my insurance?`
    );
    router.push("/chat");
  }, [answers, profileId, router]);

  // --- Shell ---

  const isIntro = step === 0;
  const isTeaser = step === 8;
  const isConfirm = step === 9;
  const showProgress = !isIntro && !isTeaser && !isConfirm;

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
          {/* ── Step 0: Intro ── */}
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center"
              style={{ background: "linear-gradient(180deg, #0F1B3D 0%, #1A3A6E 50%, #2E6BB5 100%)" }}>
              <div className="max-w-md">
                <h1 className="text-[clamp(1.6rem,5vw,2.2rem)] font-light text-white leading-tight tracking-tight mb-4">
                  Get your medical equipment <em className="font-medium not-italic">covered by insurance</em>
                </h1>
                <p className="text-[16px] text-white/60 font-light leading-relaxed mb-10">
                  We'll collect your information and help you get the equipment you need, potentially at no cost to you.
                </p>
                <button
                  onClick={advance}
                  className="w-full max-w-xs mx-auto py-4 rounded-full bg-white/[0.12] backdrop-blur-[40px] border border-white/[0.2] text-white font-semibold text-base hover:bg-white/[0.2] transition-all"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Equipment ── */}
          {step === 1 && (
            <StepLayout
              question="What equipment do you need?"
              subtitle="Select the type of medical equipment you're looking for."
              ctaLabel={answers.equipmentType ? "Continue" : undefined}
              ctaEnabled={!!answers.equipmentType}
              onCta={advance}
            >
              <div className="flex flex-col gap-2.5">
                {DME_EQUIPMENT_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt}
                    label={opt}
                    selected={answers.equipmentType === opt}
                    onClick={() => {
                      setAnswer({ equipmentType: opt });
                      if (opt !== "Other") setTimeout(advance, 400);
                    }}
                  />
                ))}
              </div>
              {answers.equipmentType === "Other" && (
                <input
                  type="text"
                  placeholder="Describe the equipment you need"
                  value={answers.equipmentNotes}
                  onChange={(e) => setAnswer({ equipmentNotes: e.target.value })}
                  className={`${inputCls} mt-3`}
                  autoFocus
                />
              )}
            </StepLayout>
          )}

          {/* ── Step 2: Patient Identity ── */}
          {step === 2 && (
            <StepLayout
              question="Tell us about yourself"
              subtitle="We need this to verify your insurance eligibility."
              ctaLabel="Continue"
              ctaEnabled={!!(answers.firstName && answers.lastName)}
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
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={answers.phone} onChange={(e) => setAnswer({ phone: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={answers.email} onChange={(e) => setAnswer({ email: e.target.value })} placeholder="you@email.com" className={inputCls} />
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 3: Shipping Address ── */}
          {step === 3 && (
            <StepLayout
              question="Where should we ship your equipment?"
              ctaLabel="Continue"
              ctaEnabled={!!(answers.shippingStreet && answers.shippingZip)}
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
                    <input type="text" value={answers.shippingState} onChange={(e) => setAnswer({ shippingState: e.target.value })} placeholder="TX" maxLength={2} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Zip</label>
                    <input type="text" value={answers.shippingZip} onChange={(e) => setAnswer({ shippingZip: e.target.value })} placeholder="78746" maxLength={5} inputMode="numeric" className={inputCls} />
                  </div>
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 4: Insurance ── */}
          {step === 4 && (
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
                  <input type="text" value={answers.insuranceProvider} onChange={(e) => setAnswer({ insuranceProvider: e.target.value })} placeholder="e.g. Aetna, UnitedHealthcare, Medicare" className={inputCls} autoFocus />
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
                  <select value={answers.insurancePlanType} onChange={(e) => setAnswer({ insurancePlanType: e.target.value })} className={inputCls}>
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
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 5: Medical ── */}
          {step === 5 && (
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

          {/* ── Step 6: Provider ── */}
          {step === 6 && (
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
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={answers.doctorPhone} onChange={(e) => setAnswer({ doctorPhone: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Fax <span className="normal-case font-normal text-[#AEAEB2]">(if known)</span></label>
                  <input type="tel" value={answers.doctorFax} onChange={(e) => setAnswer({ doctorFax: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
                </div>
              </div>
            </StepLayout>
          )}

          {/* ── Step 7: Delivery ── */}
          {step === 7 && (
            <StepLayout
              question="Delivery preferences"
              ctaLabel="Continue"
              ctaEnabled
              onCta={advance}
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>When do you need this?</label>
                  <div className="flex flex-col gap-2.5 mt-1">
                    {([
                      ["asap", "As soon as possible"],
                      ["within_week", "Within a week"],
                      ["within_month", "Within a month"],
                      ["flexible", "Flexible / no rush"],
                    ] as const).map(([val, label]) => (
                      <OptionButton key={val} label={label} selected={answers.deliveryTiming === val} onClick={() => setAnswer({ deliveryTiming: val })} />
                    ))}
                  </div>
                </div>
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

          {/* ── Step 8: Teaser / Auth Gate ── */}
          {step === 8 && (
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
                    onClick={() => dispatch({ type: "GO_TO_STEP", payload: 9 })}
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

          {/* ── Step 9: Confirmation ── */}
          {step === 9 && (
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
