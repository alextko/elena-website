import type { QuizAnswers } from "./types";

export interface Stat {
  headline: string;
  detail: string;
  source: string;
  sourceUrl: string;
}

// --- STAT POOL ---

// Age-specific
const YOUNG_ADULT_STATS: Stat[] = [
  {
    headline: "Colorectal cancer rates in young adults have doubled since 1995.",
    detail: "It's no longer an older person's disease. That's why the recommended screening age dropped from 50 to 45.",
    source: "American Cancer Society",
    sourceUrl: "https://www.cancer.org/cancer/colon-rectal-cancer/about/key-statistics.html",
  },
  {
    headline: "Most young adults with high blood pressure don't know they have it.",
    detail: "About 70% of 18-39 year olds with hypertension are undiagnosed because they rarely get screened. A checkup catches it in minutes.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/high-blood-pressure/data-research/facts-stats/index.html",
  },
  {
    headline: "About a third of young adults skip an annual checkup entirely.",
    detail: "Young men are even less likely to go. But your 20s and 30s are when early risk factors first start showing up.",
    source: "CDC National Health Interview Survey",
    sourceUrl: "https://www.cdc.gov/nchs/nhis/index.html",
  },
];

const YOUNG_ADULT_FEMALE_STATS: Stat[] = [
  {
    headline: "1 in 4 young women are behind on their Pap smear.",
    detail: "Cervical cancer is almost entirely preventable with regular screening, yet over 4,000 American women die from it every year.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/cervical-cancer/statistics/index.html",
  },
  {
    headline: "Melanoma is the second most common cancer in women under 30.",
    detail: "Skin cancer rates have been rising in young adults. A dermatology screening takes 15 minutes.",
    source: "American Cancer Society",
    sourceUrl: "https://www.cancer.org/cancer/melanoma-skin-cancer/about/key-statistics.html",
  },
];

const YOUNG_ADULT_MALE_STATS: Stat[] = [
  {
    headline: "Testicular cancer is the most common cancer in men 20-34.",
    detail: "The good news: it's over 95% curable when caught early. A self-exam takes 30 seconds.",
    source: "American Cancer Society",
    sourceUrl: "https://www.cancer.org/cancer/testicular-cancer/about/key-statistics.html",
  },
];

const THIRTIES_STATS: Stat[] = [
  {
    headline: "1 in 3 adults already has prediabetes. 80% don't know it.",
    detail: "Your 30s are when it typically develops. A simple A1C blood test catches it years before diabetes does.",
    source: "CDC National Diabetes Statistics Report",
    sourceUrl: "https://www.cdc.gov/diabetes/php/data-research/index.html",
  },
  {
    headline: "Nearly half of all adults already have at least one heart disease risk factor.",
    detail: "High blood pressure, high cholesterol, and smoking all start doing damage in your 30s, usually without symptoms.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/heart-disease/data-research/facts-stats/index.html",
  },
];

const FORTIES_STATS: Stat[] = [
  {
    headline: "Your heart attack risk roughly doubles each decade after 40.",
    detail: "1 in 5 heart attacks strikes before age 55. A lipid panel and blood pressure check can reveal problems before that happens.",
    source: "American Heart Association",
    sourceUrl: "https://www.heart.org/en/health-topics/heart-attack/understand-your-risks-to-prevent-a-heart-attack",
  },
  {
    headline: "Nearly half of adults don't know colorectal screening should start at 45.",
    detail: "The recommended age dropped from 50 to 45 in 2021. If you're 45+, you're already eligible.",
    source: "U.S. Preventive Services Task Force",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening",
  },
  {
    headline: "Your 40s are when Type 2 diabetes most commonly gets diagnosed.",
    detail: "But it was likely developing for years before. An A1C test costs under $25 and catches it early.",
    source: "CDC National Diabetes Statistics Report",
    sourceUrl: "https://www.cdc.gov/diabetes/php/data-research/index.html",
  },
];

const FORTIES_FEMALE_STATS: Stat[] = [
  {
    headline: "Barely half of women in their 40s are current on mammograms.",
    detail: "Updated guidelines now recommend screening start at 40, not 50. When caught early, breast cancer has a 99% survival rate.",
    source: "U.S. Preventive Services Task Force",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening",
  },
];

const FIFTIES_STATS: Stat[] = [
  {
    headline: "Heart disease kills 1 in 5 adults between 45 and 64.",
    detail: "The risk climbs sharply each decade. But up to 80% of heart disease events are preventable with screening and lifestyle changes.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/heart-disease/data-research/facts-stats/index.html",
  },
  {
    headline: "By your 50s, 1 in 3 adults is managing multiple chronic conditions.",
    detail: "The ones who catch them early spend less, feel better, and live longer. A yearly checkup is the foundation.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/chronic-disease/about/index.html",
  },
];

const FIFTIES_MALE_STATS: Stat[] = [
  {
    headline: "Prostate cancer risk rises sharply in your 50s.",
    detail: "1 in 8 men will be diagnosed in their lifetime. A PSA blood test is simple and can catch it early when it's most treatable.",
    source: "American Cancer Society",
    sourceUrl: "https://www.cancer.org/cancer/prostate-cancer/about/key-statistics.html",
  },
];

const FIFTIES_FEMALE_STATS: Stat[] = [
  {
    headline: "Fewer than 1 in 3 eligible women have had a bone density scan.",
    detail: "Osteoporosis has no symptoms until a fracture. A DEXA scan takes 10 minutes and is recommended for postmenopausal women with risk factors.",
    source: "U.S. Preventive Services Task Force",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/osteoporosis-screening",
  },
];

const SENIOR_STATS: Stat[] = [
  {
    headline: "About half of Medicare beneficiaries skip their free Annual Wellness Visit.",
    detail: "It's covered at no cost, and it's the single best way to catch new issues and stay on top of existing ones.",
    source: "Centers for Medicare & Medicaid Services",
    sourceUrl: "https://www.cms.gov/medicare/coverage/preventive-services/medicare-wellness-visits",
  },
  {
    headline: "1 in 4 adults over 65 falls every year.",
    detail: "Falls are the leading cause of injury death in older adults. A balance assessment and bone density check can reduce your risk.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/falls/data-research/facts-stats/index.html",
  },
  {
    headline: "Two-thirds of seniors are managing two or more chronic conditions.",
    detail: "Coordinating medications, appointments, and providers gets complex. Staying on top of screenings prevents new ones from sneaking up.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/chronic-disease/about/index.html",
  },
];

// Sex-specific (any age)
const FEMALE_STATS: Stat[] = [
  {
    headline: "1 in 8 women will be diagnosed with breast cancer.",
    detail: "When caught at an early stage, the 5-year survival rate is 99%. Regular mammograms are the difference.",
    source: "American Cancer Society",
    sourceUrl: "https://www.cancer.org/cancer/breast-cancer/about/how-common-is-breast-cancer.html",
  },
  {
    headline: "Heart disease kills 1 in 5 women, yet half don't know it's their #1 risk.",
    detail: "Women are less likely to be diagnosed, less likely to receive aggressive treatment, and more likely to die after a first heart attack than men.",
    source: "American Heart Association",
    sourceUrl: "https://www.goredforwomen.org/en/about-heart-disease-in-women/facts",
  },
];

const MALE_STATS: Stat[] = [
  {
    headline: "Prostate cancer is the most common cancer in men.",
    detail: "1 in 8 men will be diagnosed. Early detection through PSA testing makes it highly treatable.",
    source: "American Cancer Society",
    sourceUrl: "https://www.cancer.org/cancer/prostate-cancer/about/key-statistics.html",
  },
];

// Lifestyle-specific
const SMOKER_STATS: Stat[] = [
  {
    headline: "A low-dose CT scan can reduce your risk of dying from lung cancer by 20%.",
    detail: "If you're a current or recent smoker over 50, annual lung cancer screening is recommended and could save your life.",
    source: "U.S. Preventive Services Task Force",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening",
  },
  {
    headline: "Smoking doubles your risk of heart attack.",
    detail: "It's responsible for 30% of all cancer deaths. But quitting at any age reduces your risk significantly within the first year.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/heart-disease/data-research/facts-stats/index.html",
  },
];

const HEAVY_DRINKER_STATS: Stat[] = [
  {
    headline: "Alcohol accounts for about half of all liver cirrhosis deaths.",
    detail: "Your liver doesn't show symptoms until the damage is advanced. A simple blood test can check liver function.",
    source: "NIAAA",
    sourceUrl: "https://www.niaaa.nih.gov/alcohols-effects-health/alcohol-topics/alcohol-facts-and-statistics",
  },
];

const SEDENTARY_STATS: Stat[] = [
  {
    headline: "Being sedentary increases your heart disease risk by up to 50%.",
    detail: "Physical inactivity is in the same risk category as smoking and high blood pressure. Even small increases in activity make a measurable difference.",
    source: "American Heart Association",
    sourceUrl: "https://www.heart.org/en/healthy-living/fitness/fitness-basics/why-is-physical-activity-so-important-for-health-and-wellbeing",
  },
];

const POOR_SLEEP_STATS: Stat[] = [
  {
    headline: "Chronic short sleep raises your diabetes risk by up to 40%.",
    detail: "One in three adults doesn't get enough sleep. Poor sleep also increases your risk of obesity, heart disease, and depression.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/sleep/about/index.html",
  },
];

// Care gap stats
const NO_PCP_STATS: Stat[] = [
  {
    headline: "People without a primary care doctor are diagnosed later.",
    detail: "A PCP watches the full picture of your health over time. It's the single highest-impact thing you can do for long-term health.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/chronic-disease/prevention/index.html",
  },
];

const OVERDUE_STATS: Stat[] = [
  {
    headline: "Most serious conditions are treatable when caught early.",
    detail: "A single round of appointments could get you fully up to date and give you peace of mind.",
    source: "U.S. Preventive Services Task Force",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics",
  },
];

// --- SELECTION LOGIC ---

/**
 * Pick the best stat for interstitial 1 (after family history).
 * Has access to: age, sex, familyHistory
 */
export function getInterstitial1(answers: QuizAnswers): Stat {
  const hasHeart = answers.familyHistory.includes("heart_disease");
  const hasCancer = answers.familyHistory.includes("cancer");
  const hasDiabetes = answers.familyHistory.includes("diabetes");
  const hasStroke = answers.familyHistory.includes("stroke");
  const age = answers.age;
  const sex = answers.sex;

  // Prioritize family history-specific stats
  if (hasHeart) {
    return {
      headline: "Your family history of heart disease doubles your personal risk.",
      detail: age === "18-29" || age === "30-39"
        ? "Even in your age group, family history means risk factors can show up earlier than expected. A baseline heart screening now sets you up for the future."
        : "With a first-degree relative affected, early screening becomes critical. A lipid panel and blood pressure check can catch problems before they escalate.",
      source: "American Heart Association",
      sourceUrl: "https://www.heart.org/en/health-topics/heart-attack/understand-your-risks-to-prevent-a-heart-attack",
    };
  }

  if (hasCancer) {
    if (sex === "female" && (age === "40-49" || age === "50-64" || age === "65+")) {
      return FORTIES_FEMALE_STATS[0]; // mammogram stat
    }
    return {
      headline: "With cancer in your family, screening timelines may be different for you.",
      detail: age === "18-29" || age === "30-39"
        ? "Guidelines often recommend starting screenings 10 years earlier than usual when there's a family history. Knowing this now gives you a head start."
        : "Colorectal cancer has a 91% survival rate when caught early, but just 14% when caught late. The difference is a single screening.",
      source: "American Cancer Society",
      sourceUrl: "https://www.cancer.org/cancer/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html",
    };
  }

  if (hasDiabetes) {
    return {
      headline: "With diabetes in your family, your risk is significantly higher.",
      detail: "Over 80% of people with prediabetes don't know they have it. A simple A1C blood test can catch it years before diabetes develops.",
      source: "CDC National Diabetes Statistics Report",
      sourceUrl: "https://www.cdc.gov/diabetes/php/data-research/index.html",
    };
  }

  if (hasStroke) {
    return {
      headline: "With stroke in your family, prevention matters even more.",
      detail: "Up to 80% of strokes are preventable with proper screening and lifestyle management. Knowing your blood pressure and cholesterol numbers is the first step.",
      source: "American Heart Association / ASA",
      sourceUrl: "https://www.stroke.org/en/about-stroke",
    };
  }

  // No family history -- use age/sex-specific stat
  if (sex === "female" && (age === "18-29")) return YOUNG_ADULT_FEMALE_STATS[0];
  if (sex === "male" && (age === "18-29")) return YOUNG_ADULT_MALE_STATS[0];
  if (age === "18-29") return YOUNG_ADULT_STATS[0];
  if (age === "30-39") return THIRTIES_STATS[0];
  if (age === "40-49") return FORTIES_STATS[0];
  if (age === "50-64") return FIFTIES_STATS[0];
  if (age === "65+") return SENIOR_STATS[0];

  return YOUNG_ADULT_STATS[2]; // generic fallback
}

/**
 * Pick the best stat for interstitial 2 (after conditions).
 * Has access to: age, sex, familyHistory, lifestyle, conditions, symptoms
 */
export function getInterstitial2(answers: QuizAnswers): Stat {
  const smokes = answers.smokeVape === "yes";
  const heavyDrinker = answers.alcohol === "heavy";
  const sedentary = answers.exercise === "none";
  const poorSleep = answers.sleep === "poor";
  const hasSymptoms = answers.recentSymptoms.length > 0 && !answers.recentSymptoms.includes("none_symptoms");
  const hasConditions = answers.diagnosedConditions.length > 0 && !answers.diagnosedConditions.includes("none_diagnosed");
  const age = answers.age;
  const sex = answers.sex;

  // Lifestyle-specific (highest priority -- actionable)
  if (smokes) return SMOKER_STATS[0];
  if (heavyDrinker) return HEAVY_DRINKER_STATS[0];
  if (sedentary) return SEDENTARY_STATS[0];
  if (poorSleep) return POOR_SLEEP_STATS[0];

  // Symptom-specific
  if (hasSymptoms && hasConditions) {
    return {
      headline: "The symptoms you're experiencing could be connected to your conditions.",
      detail: "When existing conditions go unmonitored, new symptoms can escalate. The next questions help us figure out if you're getting the right follow-up.",
      source: "Centers for Disease Control and Prevention",
      sourceUrl: "https://www.cdc.gov/chronic-disease/about/index.html",
    };
  }

  if (hasSymptoms) {
    return {
      headline: "The symptoms you mentioned are worth investigating.",
      detail: "Persistent fatigue, chest discomfort, and unexplained weight changes can all be early warning signs. A checkup or blood test can often pinpoint the cause.",
      source: "Centers for Disease Control and Prevention",
      sourceUrl: "https://www.cdc.gov/chronic-disease/prevention/index.html",
    };
  }

  // Age/sex fallback
  if (sex === "female") return FEMALE_STATS[1]; // heart disease in women
  if (age === "18-29") return YOUNG_ADULT_STATS[1]; // undiagnosed hypertension
  if (age === "30-39") return THIRTIES_STATS[1]; // heart risk factors
  if (age === "40-49") return FORTIES_STATS[2]; // diabetes in 40s
  if (age === "50-64") return FIFTIES_STATS[1]; // multiple conditions
  if (age === "65+") return SENIOR_STATS[1]; // falls

  return OVERDUE_STATS[0];
}

/**
 * Pick the best stat for interstitial 3 (after care gaps).
 * Has access to: everything
 */
export function getInterstitial3(answers: QuizAnswers): Stat {
  const overduePhysical = answers.lastPhysical === "3+ years" || answers.lastPhysical === "never";
  const overdueBloodwork = answers.lastBloodwork === "3+ years" || answers.lastBloodwork === "never";
  const overdueScreening = answers.lastScreening === "3+ years" || answers.lastScreening === "never";
  const noPCP = answers.hasPCP === "no";
  const overdueCount = [overduePhysical, overdueBloodwork, overdueScreening].filter(Boolean).length;
  const age = answers.age;
  const sex = answers.sex;

  if (overdueCount >= 2 && noPCP) {
    return {
      headline: `You're overdue on ${overdueCount} health checks and don't have a regular doctor.`,
      detail: "That's more common than you'd think, but it's exactly the kind of gap that lets serious conditions go undetected. Getting back on track is easier than it sounds.",
      source: "Centers for Disease Control and Prevention",
      sourceUrl: "https://www.cdc.gov/chronic-disease/prevention/index.html",
    };
  }

  if (noPCP) return NO_PCP_STATS[0];

  if (overdueCount >= 2) {
    return {
      headline: `You're behind on ${overdueCount} recommended health checks.`,
      detail: "A single round of appointments could get you fully up to date. Most of these are covered by insurance at no cost to you.",
      source: "Centers for Disease Control and Prevention",
      sourceUrl: "https://www.cdc.gov/chronic-disease/prevention/index.html",
    };
  }

  if (overdueScreening) {
    // Age-specific screening urgency
    if (age === "65+") return SENIOR_STATS[2]; // chronic conditions
    if (age === "50-64") {
      if (sex === "female") return FIFTIES_FEMALE_STATS[0]; // bone density
      return FIFTIES_MALE_STATS[0]; // prostate
    }
    if (age === "40-49") return FORTIES_STATS[1]; // colonoscopy at 45
    return {
      headline: "Colorectal cancer has a 91% survival rate when caught early.",
      detail: "When caught late, it drops to 14%. The difference is often a single screening.",
      source: "American Cancer Society",
      sourceUrl: "https://www.cancer.org/cancer/colon-rectal-cancer/detection-diagnosis-staging/survival-rates.html",
    };
  }

  // On track -- give encouraging but relevant stat
  if (age === "65+") return SENIOR_STATS[0]; // wellness visit
  if (age === "50-64") return FIFTIES_STATS[0]; // heart disease
  if (age === "40-49") return FORTIES_STATS[0]; // heart attack risk doubles

  return {
    headline: "You're more on track than most people.",
    detail: "But even people who stay current on checkups can have blind spots. Let's make sure nothing is slipping through the cracks.",
    source: "Centers for Disease Control and Prevention",
    sourceUrl: "https://www.cdc.gov/chronic-disease/prevention/index.html",
  };
}
