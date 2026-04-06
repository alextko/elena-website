"use client";

import { useReducer, useCallback, useMemo, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { apiFetch } from "@/lib/apiFetch";
import { QuizShell } from "./components/quiz-shell";
import { Intro } from "./components/intro";
import { Demographics } from "./components/demographics";
import { FamilyHistory } from "./components/family-history";
import { Lifestyle } from "./components/lifestyle";
import { Conditions } from "./components/conditions";
import { CareGaps } from "./components/care-gaps";
import { GenderSpecific, shouldSkipGenderStep } from "./components/gender-specific";
import { SelfRating } from "./components/self-rating";
import { Teaser } from "./components/teaser";
import { Results } from "./components/results";
import { getRecommendations } from "./lib/recommendations";
import { INITIAL_ANSWERS } from "./lib/types";
import type { QuizAnswers, QuizStep } from "./lib/types";

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
      if (next === 6 && shouldSkipGenderStep(action.answers)) {
        next = 7;
      }
      return { ...state, step: Math.min(next, 9) as QuizStep, direction: 1 };
    }
    case "PREV_STEP": {
      let prev = (state.step - 1) as QuizStep;
      if (prev === 6 && shouldSkipGenderStep(action.answers)) {
        prev = 5;
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

  // Restore from sessionStorage on mount (client only)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = sessionStorage.getItem("elena_quiz_answers");
    if (saved) {
      try {
        const answers = JSON.parse(saved) as QuizAnswers;
        dispatch({ type: "SET_ANSWER", payload: answers });
        dispatch({ type: "GO_TO_STEP", payload: 8 });
      } catch {}
    }
  }, []);

  const { step, answers, direction } = state;

  const recommendations = useMemo(
    () => step >= 8 ? getRecommendations(answers) : [],
    [step, answers]
  );

  const setAnswer = useCallback((data: Partial<QuizAnswers>) => {
    dispatch({ type: "SET_ANSWER", payload: data });
  }, []);

  // Persist answers to sessionStorage so they survive auth redirects
  useEffect(() => {
    if (step > 0) {
      sessionStorage.setItem("elena_quiz_answers", JSON.stringify(answers));
    }
  }, [answers, step]);

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

  // "See My Results" opens the auth modal
  const handleSignup = useCallback(() => {
    sessionStorage.setItem("elena_quiz_answers", JSON.stringify(answers));
    sessionStorage.setItem("elena_quiz_recs", JSON.stringify(recommendations));
    setAuthModalOpen(true);
  }, [answers, recommendations]);

  // Save quiz results to the user's profile
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

  // Detect when user completes auth (session goes from null to non-null)
  useEffect(() => {
    if (!prevSession.current && session && step === 8) {
      setAuthModalOpen(false);
      saveQuizResults();
      sessionStorage.removeItem("elena_quiz_answers");
      sessionStorage.removeItem("elena_quiz_recs");
      dispatch({ type: "GO_TO_STEP", payload: 9 });
    }
    prevSession.current = session;
  }, [session, step, saveQuizResults]);

  // Check if returning from OAuth redirect or already-authed user with saved answers
  useEffect(() => {
    const savedAnswers = sessionStorage.getItem("elena_quiz_answers");
    if (savedAnswers && session && step === 8) {
      saveQuizResults();
      sessionStorage.removeItem("elena_quiz_answers");
      sessionStorage.removeItem("elena_quiz_recs");
      dispatch({ type: "GO_TO_STEP", payload: 9 });
    }
  }, [session, step, saveQuizResults]);

  function renderStep() {
    switch (step) {
      case 0:
        return <Intro onStart={() => dispatch({ type: "GO_TO_STEP", payload: 1 })} />;
      case 1:
        return <Demographics answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 2:
        return <FamilyHistory answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 3:
        return (
          <Lifestyle
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.sleep) advanceWithData(data);
            }}
          />
        );
      case 4:
        return <Conditions answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 5:
        return (
          <CareGaps
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.hasPCP) advanceWithData(data);
            }}
          />
        );
      case 6:
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
      case 7:
        return (
          <SelfRating
            answers={answers}
            onSubmit={(data) => {
              setAnswer(data);
              if (data.selfRating) advanceWithData(data);
            }}
          />
        );
      case 8:
        return <Teaser recommendations={recommendations} onSignup={handleSignup} />;
      case 9:
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
