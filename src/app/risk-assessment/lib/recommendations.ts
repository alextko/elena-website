import type { QuizAnswers, AgeBucket, Recommendation, QuizScore } from "./types";

function parseAge(bucket?: AgeBucket): number {
  const map: Record<AgeBucket, number> = {
    "18-29": 24, "30-39": 35, "40-49": 45, "50-64": 57, "65+": 70,
  };
  return bucket ? map[bucket] : 30;
}

export function getRecommendations(answers: QuizAnswers): Recommendation[] {
  const recs: Recommendation[] = [];
  const age = parseAge(answers.age);

  // --- OVERDUE SCREENINGS ---

  if (age >= 45 && (answers.lastScreening === "3+ years" || answers.lastScreening === "never")) {
    recs.push({
      id: "colonoscopy",
      category: "screening",
      severity: answers.familyHistory.includes("cancer") ? "high" : "medium",
      title: "Schedule a colorectal screening",
      description: "Colorectal cancer is the 2nd leading cause of cancer death in the U.S., but it's highly treatable when caught early. Screening is recommended starting at age 45.",
      action: "Find a screening provider near me",
      ctaLabel: "Schedule now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening",
    });
  }

  if (answers.sex === "female" && age >= 40 &&
      (answers.lastMammogram === "3+ years" || answers.lastMammogram === "never")) {
    recs.push({
      id: "mammogram",
      category: "screening",
      severity: answers.familyHistory.includes("cancer") ? "high" : "medium",
      title: "Schedule a mammogram",
      description: "1 in 8 women will be diagnosed with breast cancer. Regular mammograms can detect it years before symptoms appear, when survival rates are highest.",
      action: "Compare mammogram prices near me",
      ctaLabel: "Book now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening",
    });
  }

  if (answers.sex === "female" && age >= 21 && age <= 65 &&
      (answers.lastPap === "3+ years" || answers.lastPap === "never")) {
    recs.push({
      id: "pap_smear",
      category: "screening",
      severity: "medium",
      title: "Schedule a Pap smear",
      description: "Cervical cancer is almost entirely preventable with regular screening. A Pap smear every 3 years catches abnormal cells before they become dangerous.",
      action: "Schedule a Pap smear",
      ctaLabel: "Schedule now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening",
    });
  }

  if (answers.sex === "male" && age >= 50 &&
      (answers.lastProstate === "3+ years" || answers.lastProstate === "never")) {
    recs.push({
      id: "prostate",
      category: "screening",
      severity: "medium",
      title: "Schedule a prostate screening",
      description: "Prostate cancer is the most common cancer in men. A simple PSA blood test can detect it early, when treatment is most effective.",
      action: "Schedule a PSA screening",
      ctaLabel: "Schedule now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/prostate-cancer-screening",
    });
  }

  // --- CARE GAPS ---

  if (answers.lastPhysical === "3+ years" || answers.lastPhysical === "never") {
    recs.push({
      id: "physical_overdue",
      category: "care_gap",
      severity: answers.lastPhysical === "never" ? "high" : "medium",
      title: "Book an annual physical",
      description: "Annual physicals catch high blood pressure, diabetes, and other conditions years before symptoms show up. Most insurance plans cover them at no cost to you.",
      action: "Book an annual physical",
      ctaLabel: "Book now",
      source: "Centers for Disease Control and Prevention",
      sourceUrl: "https://www.cdc.gov/prevention/about/index.html",
    });
  }

  if (answers.lastBloodwork === "3+ years" || answers.lastBloodwork === "never") {
    recs.push({
      id: "bloodwork_overdue",
      category: "care_gap",
      severity: "medium",
      title: "Get routine bloodwork done",
      description: "A blood panel checks cholesterol, blood sugar, kidney function, and more. Many serious conditions have no symptoms until a blood test reveals them.",
      action: "Order a blood panel",
      ctaLabel: "Order now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication",
    });
  }

  if (answers.hasPCP === "no") {
    recs.push({
      id: "no_pcp",
      category: "care_gap",
      severity: "high",
      title: "Find a primary care doctor",
      description: "People with a primary care doctor live longer, get diagnosed earlier, and spend less on healthcare. A PCP is the single best thing you can do for your long-term health.",
      action: "Find an in-network PCP near me",
      ctaLabel: "Find now",
      source: "Centers for Disease Control and Prevention",
      sourceUrl: "https://www.cdc.gov/prevention/about/index.html",
    });
  }

  // --- RISK-BASED RECOMMENDATIONS ---

  const heartRiskFactors = [
    answers.familyHistory.includes("heart_disease"),
    answers.smokeVape === "yes",
    answers.diagnosedConditions.includes("high_bp"),
    answers.diagnosedConditions.includes("high_cholesterol"),
    answers.exercise === "none",
    answers.alcohol === "heavy",
  ].filter(Boolean).length;

  if (heartRiskFactors >= 2) {
    recs.push({
      id: "heart_screening",
      category: "screening",
      severity: heartRiskFactors >= 3 ? "high" : "medium",
      title: "Get a heart health screening",
      description: `Heart disease is the #1 killer in the U.S. You have ${heartRiskFactors} risk factors. A lipid panel and blood pressure check can reveal problems before a heart attack does.`,
      action: "Schedule a lipid panel",
      ctaLabel: "Schedule now",
      source: "American Heart Association / ACC",
      sourceUrl: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000000678",
    });
  }

  const diabetesRisk = [
    answers.familyHistory.includes("diabetes"),
    answers.diagnosedConditions.includes("prediabetes"),
    age >= 45,
    answers.exercise === "none",
  ].filter(Boolean).length;

  if (diabetesRisk >= 2) {
    recs.push({
      id: "diabetes_screening",
      category: "screening",
      severity: "medium",
      title: "Get your blood sugar tested",
      description: "1 in 3 Americans has prediabetes, and 80% don't know it. An A1C blood test takes minutes and can catch diabetes years before complications start.",
      action: "Add A1C to my blood work",
      ctaLabel: "Order now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes",
    });
  }

  if (answers.familyHistory.includes("stroke") &&
      (answers.diagnosedConditions.includes("high_bp") || answers.smokeVape === "yes")) {
    recs.push({
      id: "stroke_consultation",
      category: "screening",
      severity: "high",
      title: "Schedule a stroke risk assessment",
      description: "Stroke is the 5th leading cause of death, but 80% of strokes are preventable. Your family history and risk factors make early assessment critical.",
      action: "Schedule a consultation",
      ctaLabel: "Book now",
      source: "American Heart Association / ASA",
      sourceUrl: "https://www.ahajournals.org/doi/10.1161/STR.0000000000000375",
    });
  }

  // --- LIFESTYLE RECOMMENDATIONS ---

  if (answers.smokeVape === "yes") {
    recs.push({
      id: "cessation",
      category: "lifestyle",
      severity: "high",
      title: "Find a smoking cessation program",
      description: "Smoking doubles your risk of heart attack and is responsible for 30% of all cancer deaths. Quitting at any age cuts your risk significantly within the first year.",
      action: "Find cessation programs near me",
      ctaLabel: "Find now",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/tobacco-use-in-adults-and-pregnant-women-counseling-and-interventions",
    });
  }

  // --- SYMPTOM-SPECIFIC RECOMMENDATIONS ---

  if (answers.recentSymptoms.includes("chest_discomfort")) {
    recs.push({
      id: "chest_cardiology",
      category: "screening",
      severity: "high",
      title: "Schedule a cardiology appointment",
      description: "Chest discomfort can signal coronary artery disease, arrhythmia, or other cardiac conditions. An EKG or stress test can rule out serious causes quickly.",
      action: "Find a cardiologist near me",
      ctaLabel: "Book now",
      source: "AHA/ACC Chest Pain Guideline",
      sourceUrl: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001029",
    });
  }

  if (answers.recentSymptoms.includes("unexplained_weight")) {
    recs.push({
      id: "weight_endocrinology",
      category: "screening",
      severity: "high",
      title: "Get a thyroid and metabolic panel",
      description: "Unexplained weight changes can indicate thyroid disorders, hormonal imbalances, or metabolic conditions. A blood test can pinpoint the cause.",
      action: "Order a thyroid panel",
      ctaLabel: "Order now",
      source: "American Thyroid Association",
      sourceUrl: "https://www.thyroid.org/thyroid-function-tests/",
    });
  }

  if (answers.recentSymptoms.includes("digestive")) {
    recs.push({
      id: "digestive_gi",
      category: "screening",
      severity: "medium",
      title: "Schedule a GI consultation",
      description: "Persistent digestive issues can indicate conditions like IBS, GERD, or celiac disease. Early evaluation prevents complications and improves quality of life.",
      action: "Find a gastroenterologist near me",
      ctaLabel: "Book now",
      source: "American College of Gastroenterology",
      sourceUrl: "https://gi.org/guidelines/",
    });
  }

  if (answers.recentSymptoms.includes("fatigue") && !recs.some(r => r.id === "bloodwork_overdue")) {
    recs.push({
      id: "fatigue_bloodwork",
      category: "screening",
      severity: "medium",
      title: "Get bloodwork to check for fatigue causes",
      description: "Persistent fatigue is often caused by anemia, thyroid dysfunction, or vitamin D deficiency. These are easy to detect and treat with a simple blood test.",
      action: "Order a comprehensive blood panel",
      ctaLabel: "Order now",
      source: "American Academy of Family Physicians",
      sourceUrl: "https://www.aafp.org/pubs/afp/issues/2022/0201/p137.html",
    });
  }

  // --- CATCH-ALL ---

  if ((answers.lastScreening === "3+ years" || answers.lastScreening === "never") &&
      !recs.some(r => r.category === "screening")) {
    recs.push({
      id: "screening_checkup",
      category: "screening",
      severity: "medium",
      title: "Find out what screenings you need",
      description: "Preventive screenings are the most effective way to catch serious conditions early. What you need depends on your age, sex, and family history.",
      action: "Find out what screenings I need",
      ctaLabel: "Get started",
      source: "U.S. Preventive Services Task Force",
      sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics",
    });
  }

  // Sort: high severity first
  const order = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => order[a.severity] - order[b.severity]);

  return recs;
}

export function getQuizScore(recommendations: Recommendation[]): QuizScore {
  // Score based on number and severity of recommendations
  const highCount = recommendations.filter(r => r.severity === "high").length;
  const mediumCount = recommendations.filter(r => r.severity === "medium").length;
  const lowCount = recommendations.filter(r => r.severity === "low").length;

  // Each high = 15 points, medium = 8 points, low = 3 points
  const riskPoints = highCount * 15 + mediumCount * 8 + lowCount * 3;

  // Clamp to 0-100
  const value = Math.min(100, Math.max(0, riskPoints));

  if (value >= 60) return { value, label: "High Risk", color: "#EF4444" };
  if (value >= 35) return { value, label: "Moderate Risk", color: "#F59E0B" };
  if (value >= 15) return { value, label: "Low Risk", color: "#3B82F6" };
  return { value, label: "Minimal Risk", color: "#22C55E" };
}
