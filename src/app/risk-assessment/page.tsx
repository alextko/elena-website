"use client";

import { useReducer, useCallback, useMemo, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { apiFetch } from "@/lib/apiFetch";
import * as analytics from "@/lib/analytics";
import { trackViewContent } from "@/lib/tracking-events";
import { QuizShell } from "./components/quiz-shell";
import { Intro } from "./components/intro";
import { Demographics } from "./components/demographics";
import { FamilyHistory } from "./components/family-history";
import { Lifestyle } from "./components/lifestyle";
import { Conditions } from "./components/conditions";
import { CareGaps } from "./components/care-gaps";
import { GenderSpecific, shouldSkipGenderStep } from "./components/gender-specific";
import { SelfRating } from "./components/self-rating";
import { Interstitial } from "./components/interstitial";
import { Teaser } from "./components/teaser";
import { getInterstitial1, getInterstitial2, getInterstitial3 } from "./lib/stats";
import { Results } from "./components/results";
import { getRecommendations } from "./lib/recommendations";
import { INITIAL_ANSWERS } from "./lib/types";
import type { QuizAnswers, QuizStep } from "./lib/types";

// Step map:
// 0: Intro, 1: Demographics, 2: Family History, 3: Interstitial (family),
// 4: Lifestyle, 5: Conditions, 6: Interstitial (screenings), 7: Care Gaps,
// 8: Interstitial (cost), 9: Gender-Specific, 10: Self-Rating,
// 11: Teaser, 12: Results

const TOTAL_QUESTION_STEPS = 10; // for progress bar (exclude intro, teaser, results)
const INTERSTITIAL_STEPS = new Set([3, 6, 8]);

// --- Reducer ---

interface QuizState {
  step: QuizStep;
  answers: QuizAnswers;
  direction: 1 | -1;
}

type QuizAction =
  | { type: "SET_ANSWER"; payload: Partial<QuizAnswers> }
  | { type: "NEXT_STEP"; answers: QuizAnswers }
  | { type: "PREV_STEP"; answers: QuizAnswers }
  | { type: "GO_TO_STEP"; payload: QuizStep };

function reducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, ...action.payload } };
    case "NEXT_STEP": {
      let next = (state.step + 1) as QuizStep;
      if (next === 9 && shouldSkipGenderStep(action.answers)) {
        next = 10;
      }
      return { ...state, step: Math.min(next, 12) as QuizStep, direction: 1 };
    }
    case "PREV_STEP": {
      let prev = (state.step - 1) as QuizStep;
      if (prev === 9 && shouldSkipGenderStep(action.answers)) {
        prev = 8;
      }
      return { ...state, step: Math.max(prev, 0) as QuizStep, direction: -1 };
    }
    case "GO_TO_STEP":
      return { ...state, step: action.payload, direction: action.payload > state.step ? 1 : -1 };
    default:
      return state;
  }
}

// --- Main Component ---

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, profileId } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const prevSession = useRef(session);
  const savedResultsRef = useRef(false);

  const [state, dispatch] = useReducer(reducer, {
    step: 0 as QuizStep,
    answers: { ...INITIAL_ANSWERS },
    direction: 1 as const,
  });

  // Track page view on mount
  const hasTrackedPageView = useRef(false);
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      analytics.track("Quiz Page Viewed", { quiz: "health_assessment" });
      trackViewContent("landing_page", "risk_assessment");
    }
  }, []);

  // Restore from sessionStorage on mount (client only)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = sessionStorage.getItem("elena_quiz_answers");
    const savedStep = sessionStorage.getItem("elena_quiz_step");
    if (saved) {
      try {
        const answers = JSON.parse(saved) as QuizAnswers;
        dispatch({ type: "SET_ANSWER", payload: answers });
        const step = savedStep ? parseInt(savedStep, 10) as QuizStep : 11;
        dispatch({ type: "GO_TO_STEP", payload: step });
      } catch {}
    }
  }, []);

  const { step, answers, direction } = state;

  const recommendations = useMemo(
    () => step >= 11 ? getRecommendations(answers) : [],
    [step, answers]
  );

  const setAnswer = useCallback((data: Partial<QuizAnswers>) => {
    dispatch({ type: "SET_ANSWER", payload: data });
  }, []);

  const advance = useCallback(() => {
    dispatch({ type: "NEXT_STEP", answers });
  }, [answers]);

  const advanceWithData = useCallback((data: Partial<QuizAnswers>) => {
    const newAnswers = { ...answers, ...data };
    dispatch({ type: "SET_ANSWER", payload: data });
    setTimeout(() => dispatch({ type: "NEXT_STEP", answers: newAnswers }), 400);
  }, [answers]);

  const goBack = useCallback(() => {
    dispatch({ type: "PREV_STEP", answers });
  }, [answers]);

  // Persist answers and step to sessionStorage
  useEffect(() => {
    if (step > 0 && step < 12) {
      sessionStorage.setItem("elena_quiz_answers", JSON.stringify(answers));
      sessionStorage.setItem("elena_quiz_step", String(step));
    }
  }, [answers, step]);

  // Track step changes
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (step === prevStepRef.current) return;
    prevStepRef.current = step;

    if (step === 1) {
      analytics.track("Quiz Started", { quiz: "health_assessment" });
    } else if (INTERSTITIAL_STEPS.has(step)) {
      analytics.track("Quiz Interstitial Viewed", { quiz: "health_assessment", step });
    } else if (step === 11) {
      analytics.track("Quiz Completed", {
        quiz: "health_assessment",
        recommendation_count: recommendations.length,
      });
      analytics.track("Quiz Results Gate Shown", {
        quiz: "health_assessment",
        recommendation_count: recommendations.length,
      });
    } else if (step === 12) {
      analytics.track("Quiz Results Viewed", {
        quiz: "health_assessment",
        recommendation_count: recommendations.length,
      });
    } else if (step > 0 && step < 11) {
      analytics.track("Quiz Step Completed", { quiz: "health_assessment", step });
    }
  }, [step, recommendations.length]);

  const handleSignup = useCallback(() => {
    analytics.track("Quiz Signup Clicked", {
      quiz: "health_assessment",
      recommendation_count: recommendations.length,
    });
    // Tag this user's session as coming from the quiz funnel.
    // registerOnce: attaches to every subsequent event (super property, set once)
    // setPeopleProperties: persists on the user profile for segmentation
    analytics.registerOnce({ acquisition_source: "quiz", quiz_type: "health_assessment" });
    analytics.setPeopleProperties({ acquisition_source: "quiz", quiz_type: "health_assessment" });
    sessionStorage.setItem("elena_quiz_answers", JSON.stringify(answers));
    sessionStorage.setItem("elena_quiz_recs", JSON.stringify(recommendations));
    setAuthModalOpen(true);
  }, [answers, recommendations]);

  const saveQuizResults = useCallback(async () => {
    if (savedResultsRef.current || !profileId) return;
    savedResultsRef.current = true;
    const recs = getRecommendations(answers);
    try {
      await apiFetch(`/profile/${profileId}/quiz-results`, {
        method: "POST",
        body: JSON.stringify({
          quiz_type: "health_assessment",
          answers,
          recommendations: recs,
        }),
      });
    } catch (e) {
      console.error("[Quiz] Failed to save results:", e);
    }
  }, [profileId, answers]);

  // Detect auth completion
  useEffect(() => {
    if (!prevSession.current && session && step === 11) {
      setAuthModalOpen(false);
      saveQuizResults();
      sessionStorage.removeItem("elena_quiz_answers");
      sessionStorage.removeItem("elena_quiz_recs");
      sessionStorage.removeItem("elena_quiz_step");
      dispatch({ type: "GO_TO_STEP", payload: 12 });
    }
    prevSession.current = session;
  }, [session, step, saveQuizResults]);

  // Check if returning from OAuth or already-authed
  useEffect(() => {
    const savedAnswers = sessionStorage.getItem("elena_quiz_answers");
    if (savedAnswers && session && step === 11) {
      saveQuizResults();
      sessionStorage.removeItem("elena_quiz_answers");
      sessionStorage.removeItem("elena_quiz_recs");
      sessionStorage.removeItem("elena_quiz_step");
      dispatch({ type: "GO_TO_STEP", payload: 12 });
    }
  }, [session, step, saveQuizResults]);

  function renderInterstitial(stat: { headline: string; detail: string; source: string; sourceUrl: string }) {
    return <Interstitial headline={stat.headline} detail={stat.detail} source={stat.source} sourceUrl={stat.sourceUrl} onContinue={advance} onBack={goBack} />;
  }

  function renderStep() {
    switch (step) {
      case 0:
        return <Intro onStart={() => dispatch({ type: "GO_TO_STEP", payload: 1 })} />;
      case 1:
        return <Demographics answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 2:
        return <FamilyHistory answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 3:
        return renderInterstitial(getInterstitial1(answers));
      case 4:
        return (
          <Lifestyle
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.sleep) advanceWithData(data);
            }}
          />
        );
      case 5:
        return <Conditions answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 6:
        return renderInterstitial(getInterstitial2(answers));
      case 7:
        return (
          <CareGaps
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.hasPCP) advanceWithData(data);
            }}
          />
        );
      case 8:
        return renderInterstitial(getInterstitial3(answers));
      case 9:
        return (
          <GenderSpecific
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.lastPap || data.lastMammogram || data.lastProstate) {
                advanceWithData(data);
              }
            }}
          />
        );
      case 10:
        return (
          <SelfRating
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.selfRating) advanceWithData(data);
            }}
          />
        );
      case 11:
        return <Teaser recommendations={recommendations} onSignup={handleSignup} />;
      case 12:
        return <Results recommendations={recommendations} answers={answers} />;
      default:
        return null;
    }
  }

  return (
    <>
      <QuizShell step={step} direction={direction} onBack={goBack}>
        {renderStep()}
      </QuizShell>
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        oauthRedirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/risk-assessment?completed=1`}
        defaultMode="signup"
      />
    </>
  );
}

export default function RiskAssessmentPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#F7F6F2]" />}>
      <QuizContent />
    </Suspense>
  );
}
