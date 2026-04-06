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
      // Skip back over interstitials
      while (INTERSTITIAL_STEPS.has(prev) && prev > 0) {
        prev = (prev - 1) as QuizStep;
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

  function renderStep() {
    switch (step) {
      case 0:
        return <Intro onStart={() => dispatch({ type: "GO_TO_STEP", payload: 1 })} />;
      case 1:
        return <Demographics answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 2:
        return <FamilyHistory answers={answers} onSubmit={setAnswer} onAdvance={advance} />;
      case 3: {
        const hasHeartFamily = answers.familyHistory.includes("heart_disease");
        const hasCancerFamily = answers.familyHistory.includes("cancer");
        const hasDiabetesFamily = answers.familyHistory.includes("diabetes");
        const hasStrokeFamily = answers.familyHistory.includes("stroke");
        const hasNone = answers.familyHistory.includes("none") || answers.familyHistory.length === 0;

        let headline = "Family history is one of the strongest predictors of your health.";
        let detail = "Even without a family history, the next few questions help us identify lifestyle and screening gaps that matter for your age group.";
        let source = "American Heart Association";
        let sourceUrl = "https://www.heart.org/en/health-topics/heart-attack/understand-your-risks-to-prevent-a-heart-attack";

        if (hasHeartFamily) {
          headline = "Your family history of heart disease doubles your risk.";
          detail = "With a first-degree relative affected, your risk of heart disease is roughly 2x higher. The good news: early screening and lifestyle changes can significantly reduce that risk.";
        } else if (hasCancerFamily) {
          const ageNote = answers.age === "40-49" || answers.age === "50-64" || answers.age === "65+"
            ? " Especially in your age group, early screening is critical."
            : " Guidelines may recommend starting screenings earlier than usual for you.";
          headline = "With cancer in your family, early screening could save your life.";
          detail = `When colorectal cancer is caught early, the survival rate is 91%. When caught late, it's just 14%.${ageNote}`;
          source = "American Cancer Society";
          sourceUrl = "https://www.cancer.org/cancer/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html";
        } else if (hasDiabetesFamily) {
          headline = "Family history of diabetes puts you at higher risk.";
          detail = "Over 80% of people with prediabetes don't know they have it. A simple A1C blood test can catch it years before complications start.";
          source = "Centers for Disease Control and Prevention";
          sourceUrl = "https://www.cdc.gov/diabetes/data/statistics-report/index.html";
        } else if (hasStrokeFamily) {
          headline = "With stroke in your family, prevention matters even more.";
          detail = "Up to 80% of strokes are preventable. Knowing your risk factors early means you can take action before something happens.";
          source = "American Heart Association / ASA";
          sourceUrl = "https://www.stroke.org/en/about-stroke";
        } else if (hasNone) {
          headline = "No family history is great news. But it's not the whole picture.";
          detail = "Lifestyle, age, and screening gaps can still put you at risk. The next few questions help us find anything you might be missing.";
        }

        return (
          <Interstitial
            headline={headline}
            detail={detail}
            source={source}
            sourceUrl={sourceUrl}
            onContinue={advance}
          />
        );
      }
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
      case 6: {
        const hasConditions = answers.diagnosedConditions.length > 0 && !answers.diagnosedConditions.includes("none_diagnosed");
        const hasSymptoms = answers.recentSymptoms.length > 0 && !answers.recentSymptoms.includes("none_symptoms");
        const smokes = answers.smokeVape === "yes";
        const noExercise = answers.exercise === "none";

        let headline = "1 in 3 adults are behind on at least one recommended screening.";
        let detail = "Most people don't realize they're overdue. Early detection is the single biggest factor in survival rates for cancer, heart disease, and diabetes.";
        let source = "Centers for Disease Control and Prevention";
        let sourceUrl = "https://www.cdc.gov/nchs/fastats/physician-visits.htm";

        if (hasSymptoms && hasConditions) {
          headline = "The symptoms you're experiencing could be connected to your conditions.";
          detail = "When existing conditions go unmonitored, new symptoms can escalate quickly. The next questions help us figure out if you're getting the right follow-up care.";
        } else if (hasSymptoms) {
          headline = "The symptoms you mentioned deserve attention.";
          detail = "Persistent fatigue, chest discomfort, and unexplained weight changes can all be early warning signs. A simple checkup or blood test can often identify the cause.";
        } else if (smokes && hasConditions) {
          headline = "Smoking combined with existing conditions significantly increases your risk.";
          detail = "Smoking doubles the risk of heart attack and makes existing conditions like high blood pressure and high cholesterol much more dangerous. But quitting at any age helps immediately.";
          source = "U.S. Preventive Services Task Force";
          sourceUrl = "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/tobacco-use-in-adults-and-pregnant-women-counseling-and-interventions";
        } else if (noExercise) {
          headline = "Physical inactivity is a major risk factor on its own.";
          detail = "Lack of exercise increases risk for heart disease, diabetes, and several cancers. Even small increases in activity can make a measurable difference in your numbers.";
          source = "Centers for Disease Control and Prevention";
          sourceUrl = "https://www.cdc.gov/physicalactivity/basics/pa-health/index.htm";
        }

        return (
          <Interstitial
            headline={headline}
            detail={detail}
            source={source}
            sourceUrl={sourceUrl}
            onContinue={advance}
          />
        );
      }
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
      case 8: {
        const overduePhysical = answers.lastPhysical === "3+ years" || answers.lastPhysical === "never";
        const overdueBloodwork = answers.lastBloodwork === "3+ years" || answers.lastBloodwork === "never";
        const overdueScreening = answers.lastScreening === "3+ years" || answers.lastScreening === "never";
        const noPCP = answers.hasPCP === "no";
        const overdueCount = [overduePhysical, overdueBloodwork, overdueScreening].filter(Boolean).length;

        let headline: string;
        let detail: string;
        let source = "American Cancer Society";
        let sourceUrl = "https://www.cancer.org/cancer/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html";

        if (overdueCount >= 2 && noPCP) {
          headline = `You're overdue on ${overdueCount} screenings and don't have a doctor.`;
          detail = "That's not uncommon, but it's exactly the kind of gap that lets serious conditions go undetected. The good news: getting back on track is easier than you think.";
          source = "Centers for Disease Control and Prevention";
          sourceUrl = "https://www.cdc.gov/prevention/about/index.html";
        } else if (overdueCount >= 2) {
          headline = `You're behind on ${overdueCount} recommended health checks.`;
          detail = "Most serious conditions are treatable when caught early. A single round of appointments could get you fully up to date.";
          source = "Centers for Disease Control and Prevention";
          sourceUrl = "https://www.cdc.gov/prevention/about/index.html";
        } else if (noPCP) {
          headline = "People without a primary care doctor are diagnosed later.";
          detail = "Having a PCP means someone is watching the full picture of your health over time. It's the single highest-impact thing you can do for long-term health.";
          source = "Centers for Disease Control and Prevention";
          sourceUrl = "https://www.cdc.gov/prevention/about/index.html";
        } else if (overdueScreening) {
          const isOlder = answers.age === "40-49" || answers.age === "50-64" || answers.age === "65+";
          headline = isOlder
            ? "In your age group, screening is no longer optional."
            : "Colorectal cancer has a 91% survival rate when caught early.";
          detail = isOlder
            ? "Rates of colorectal, breast, and prostate cancer all increase significantly after 40. A single screening can catch something years before symptoms appear."
            : "When caught late, that drops to 14%. The difference is often a single screening that takes less than an hour.";
        } else {
          headline = "You're more on track than most people.";
          detail = "But even people who stay current on checkups can have blind spots. Let's make sure nothing is slipping through the cracks.";
        }

        return (
          <Interstitial
            headline={headline}
            detail={detail}
            source={source}
            sourceUrl={sourceUrl}
            onContinue={advance}
          />
        );
      }
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
