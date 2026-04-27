// Situation templates used by the onboarding tour's condition block
// (situation → meds → care-plan → validation → elena-plan phases).
//
// ─────────────────────────────────────────────────────────────────────
// CLINICAL CONTENT — SOURCES + REVIEW STATUS
// ─────────────────────────────────────────────────────────────────────
// Every template has a `source` field naming the guideline body it was
// baselined against and a `sourceUrl` pointing at its current guidelines
// landing page. Same provenance standard any patient-education publisher
// (Mayo Clinic, WebMD, MyChart) uses.
//
// Content should be verified against the current edition of each cited
// source before launch. Sources shift year-over-year; re-check when
// refreshing a template.
// ─────────────────────────────────────────────────────────────────────
//
// ─────────────────────────────────────────────────────────────────────
// CARE PLAN CURATION RULE
// ─────────────────────────────────────────────────────────────────────
// planItems list only items Elena can concretely help with: appointments
// (book), labs (schedule), imaging (schedule), vaccines (coordinate),
// refills (call pharmacy / provider), insurance coverage checks.
//
// Excluded: lifestyle behaviors (exercise, sleep, diet), self-tracking
// (logs, home readings, pain journals), compliance (taking meds daily),
// and generic preventive care not tied to the specific condition.
//
// ─────────────────────────────────────────────────────────────────────
// HERO VALUES FRAMING
// ─────────────────────────────────────────────────────────────────────
// heroValues use first-person "I can <verb> <specific thing>" where the
// verb is a concrete action: call, schedule, book, coordinate, research,
// price-shop, find. The point is to communicate that Elena automates
// the job the user is doing today, not that she passively tracks or
// reminds.

export type CarePlanItem = {
  id: string;
  label: string;
  todoText: string;
};

export type SituationTemplate = {
  key: string;
  label: string;
  conditionName: string;
  medsPrompt: string;
  medOptions: string[];
  planItems: CarePlanItem[];
  heroValues: string[];
  source: string;
  sourceUrl: string;
  fallback?: boolean;
};

export const SITUATION_TEMPLATES: Record<string, SituationTemplate> = {
  // ── Cardiometabolic ────────────────────────────────────────────────
  t2_diabetes: {
    key: "t2_diabetes",
    label: "Type 2 diabetes",
    conditionName: "Type 2 diabetes",
    medsPrompt: "People managing type 2 diabetes are often on one of these. Any yours?",
    medOptions: ["Metformin", "Ozempic", "Mounjaro", "Jardiance", "Glipizide", "Insulin", "Trulicity", "Januvia"],
    planItems: [
      { id: "a1c", label: "A1C blood test in the last 3 months", todoText: "Schedule an A1C check" },
      { id: "eye", label: "Eye exam (retinopathy screening) in the last year", todoText: "Book an annual diabetic eye exam" },
      { id: "foot", label: "Foot exam with your doctor", todoText: "Ask your PCP for a diabetic foot exam" },
      { id: "kidney", label: "Kidney function test in the last year", todoText: "Schedule urine microalbumin test" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check blood pressure with your PCP" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
    ],
    heroValues: [
      "I can call your endocrinologist to book your next A1C.",
      "I can call your insurance to check GLP-1 coverage.",
      "I can coordinate your eye and foot exams with your PCP.",
    ],
    source: "ADA Standards of Medical Care in Diabetes (2025)",
    sourceUrl: "https://diabetesjournals.org/care/issue/48/Supplement_1",
  },

  hypertension: {
    key: "hypertension",
    label: "High blood pressure",
    conditionName: "Hypertension",
    medsPrompt: "People managing high blood pressure are often on one of these. Any yours?",
    medOptions: ["Lisinopril", "Amlodipine", "Losartan", "Hydrochlorothiazide", "Metoprolol", "Atenolol", "Valsartan", "Chlorthalidone"],
    planItems: [
      { id: "bp_visit", label: "BP check with your PCP in the last 6 months", todoText: "Schedule a BP check-in with your PCP" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "kidney", label: "Kidney function test in the last year", todoText: "Schedule kidney function labs" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can call your PCP to book your next BP check.",
      "I can call your pharmacy for refill renewals.",
      "I can research cheaper generic or mail-order options.",
    ],
    source: "ACC/AHA Guideline for High Blood Pressure in Adults (2017, updated)",
    sourceUrl: "https://www.acc.org/guidelines",
  },

  high_cholesterol: {
    key: "high_cholesterol",
    label: "High cholesterol",
    conditionName: "High cholesterol",
    medsPrompt: "People managing high cholesterol are often on one of these. Any yours?",
    medOptions: ["Atorvastatin (Lipitor)", "Rosuvastatin (Crestor)", "Simvastatin", "Pravastatin", "Ezetimibe (Zetia)", "Repatha", "Praluent", "Red yeast rice"],
    planItems: [
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "liver", label: "Liver enzyme check in the last year", todoText: "Schedule liver enzyme labs" },
      { id: "glucose", label: "A1C or fasting glucose in the last year", todoText: "Schedule an A1C or glucose check" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check blood pressure with your PCP" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can schedule your lipid panel and follow-up visit.",
      "I can call your provider to renew your statin.",
      "I can find cheaper generic or mail-order options.",
    ],
    source: "ACC/AHA Guideline on the Management of Blood Cholesterol (2018)",
    sourceUrl: "https://www.acc.org/guidelines",
  },

  prediabetes: {
    key: "prediabetes",
    label: "Prediabetes",
    conditionName: "Prediabetes",
    medsPrompt: "People managing prediabetes sometimes take one of these. Any yours?",
    medOptions: ["Metformin", "Ozempic", "Wegovy", "Berberine", "Not on any meds"],
    planItems: [
      { id: "a1c", label: "A1C or fasting glucose in the last 6 months", todoText: "Schedule an A1C or glucose check" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check blood pressure with your PCP" },
      { id: "nutrition", label: "Nutrition or DPP consult in the last year", todoText: "Book a nutrition or DPP consult" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can schedule your next A1C check.",
      "I can find an in-network nutrition or DPP consult.",
      "I can price-shop your labs before you go.",
    ],
    source: "ADA Standards of Medical Care + CDC National Diabetes Prevention Program (2025)",
    sourceUrl: "https://diabetesjournals.org/care/issue/48/Supplement_1",
  },

  obesity: {
    key: "obesity",
    label: "Weight management",
    conditionName: "Obesity / weight management",
    medsPrompt: "People managing weight are often on one of these. Any yours?",
    medOptions: ["Wegovy", "Zepbound", "Ozempic", "Mounjaro", "Saxenda", "Contrave", "Phentermine", "Qsymia"],
    planItems: [
      { id: "weight", label: "Weight and BMI check with your PCP", todoText: "Book a weight and BMI check" },
      { id: "a1c", label: "A1C or fasting glucose in the last year", todoText: "Schedule an A1C or glucose check" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "liver", label: "Liver enzyme check in the last year", todoText: "Schedule liver enzyme labs" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check blood pressure with your PCP" },
      { id: "sleep", label: "Sleep apnea screening in the last 2 years", todoText: "Book a sleep apnea screening" },
      { id: "nutrition", label: "Nutrition consult in the last year", todoText: "Book a nutrition consult" },
    ],
    heroValues: [
      "I can call your insurance to check GLP-1 coverage.",
      "I can find cheaper Wegovy or Zepbound options.",
      "I can coordinate your nutrition and PCP visits.",
    ],
    source: "AACE Obesity Management Algorithm + USPSTF Behavioral Weight Loss Interventions (2024)",
    sourceUrl: "https://pro.aace.com/disease-state-resources/nutrition-and-obesity",
  },

  atrial_fibrillation: {
    key: "atrial_fibrillation",
    label: "Atrial fibrillation (AFib)",
    conditionName: "Atrial fibrillation",
    medsPrompt: "For AFib, any of these in the mix?",
    medOptions: ["Eliquis (apixaban)", "Xarelto (rivaroxaban)", "Warfarin", "Pradaxa (dabigatran)", "Metoprolol", "Diltiazem", "Amiodarone", "Flecainide"],
    planItems: [
      { id: "cardio_visit", label: "Cardiology visit in the last 6 months", todoText: "Schedule a cardiology visit" },
      { id: "ecg", label: "ECG or rhythm check in the last year", todoText: "Schedule an ECG" },
      { id: "echo", label: "Echocardiogram if recommended", todoText: "Ask about an echo on schedule" },
      { id: "inr", label: "INR checks if on warfarin", todoText: "Schedule INR checks" },
      { id: "bp", label: "Blood pressure check in the last 3 months", todoText: "Check BP with your PCP" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can call your cardiologist to book your next visit.",
      "I can call your pharmacy for anticoagulant refills.",
      "I can call your insurance to check coverage changes.",
    ],
    source: "ACC/AHA/ACCP/HRS Guideline for Atrial Fibrillation (2023)",
    sourceUrl: "https://www.acc.org/guidelines",
  },

  heart_failure: {
    key: "heart_failure",
    label: "Heart failure",
    conditionName: "Heart failure",
    medsPrompt: "For heart failure, any of these in the mix?",
    medOptions: ["Entresto (sacubitril/valsartan)", "Metoprolol succinate", "Carvedilol", "Furosemide (Lasix)", "Spironolactone", "Jardiance", "Farxiga", "Lisinopril"],
    planItems: [
      { id: "cardio_visit", label: "Cardiology visit in the last 3 months", todoText: "Schedule a cardiology visit" },
      { id: "labs", label: "BMP + BNP in the last 3 months", todoText: "Schedule BMP and BNP labs" },
      { id: "echo", label: "Echocardiogram if recommended", todoText: "Ask about an echo on schedule" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
      { id: "pneumo", label: "Pneumococcal vaccine if due", todoText: "Check pneumococcal vaccine status" },
    ],
    heroValues: [
      "I can call your cardiologist for your next check-in.",
      "I can call your pharmacy for Entresto and diuretic refills.",
      "I can call your insurance before each specialist visit.",
    ],
    source: "ACC/AHA/HFSA Guideline for the Management of Heart Failure (2022)",
    sourceUrl: "https://www.acc.org/guidelines",
  },

  // ── Respiratory ────────────────────────────────────────────────────
  asthma: {
    key: "asthma",
    label: "Asthma",
    conditionName: "Asthma",
    medsPrompt: "People managing asthma are often on one of these. Any yours?",
    medOptions: ["Albuterol (rescue)", "Symbicort", "Advair", "Trelegy", "Breo Ellipta", "Flovent", "Singulair", "Dupixent"],
    planItems: [
      { id: "action_plan", label: "Asthma action plan with your doctor", todoText: "Book a visit to update your action plan" },
      { id: "spirometry", label: "Spirometry in the last year", todoText: "Schedule annual spirometry" },
      { id: "specialist", label: "Pulmonology visit if asthma is uncontrolled", todoText: "Ask for a pulmonology referral" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can call your pharmacy when your rescue is low.",
      "I can call your insurance to check controller med coverage.",
      "I can find an in-network pulmonologist.",
    ],
    source: "GINA Global Strategy for Asthma Management and Prevention (2024)",
    sourceUrl: "https://ginasthma.org/reports/",
  },

  allergies: {
    key: "allergies",
    label: "Seasonal allergies",
    conditionName: "Seasonal allergies",
    medsPrompt: "People managing allergies are often on one of these. Any yours?",
    medOptions: ["Claritin (loratadine)", "Zyrtec (cetirizine)", "Allegra (fexofenadine)", "Flonase", "Nasonex", "Singulair", "Astepro", "Azelastine"],
    planItems: [
      { id: "allergist", label: "Allergist visit in the last 2 years", todoText: "Book an allergist visit" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can find an in-network allergist and book a visit.",
      "I can research OTC costs before you refill.",
      "I can book your allergy shots on schedule.",
    ],
    source: "AAAAI / ACAAI Joint Task Force Practice Parameters on Allergic Rhinitis",
    sourceUrl: "https://www.aaaai.org/practice-resources/clinical-practice-guidelines",
  },

  copd: {
    key: "copd",
    label: "COPD",
    conditionName: "COPD",
    medsPrompt: "For COPD, any of these in the mix?",
    medOptions: ["Albuterol (rescue)", "Spiriva (tiotropium)", "Trelegy", "Breo Ellipta", "Symbicort", "Anoro", "Daliresp (roflumilast)", "Azithromycin (preventive)"],
    planItems: [
      { id: "pulmonology", label: "Pulmonology visit in the last year", todoText: "Schedule a pulmonology visit" },
      { id: "spirometry", label: "Spirometry in the last year", todoText: "Schedule annual spirometry" },
      { id: "rehab", label: "Pulmonary rehab if recommended", todoText: "Ask about pulmonary rehab" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
      { id: "pneumo", label: "Pneumococcal vaccine if due", todoText: "Check pneumococcal vaccine status" },
      { id: "rsv", label: "RSV vaccine if age 60+", todoText: "Ask about the RSV vaccine" },
    ],
    heroValues: [
      "I can call your pulmonologist to book a visit.",
      "I can call your insurance to check inhaler coverage.",
      "I can find pulmonary rehab in-network.",
    ],
    source: "GOLD Report (Global Initiative for Chronic Obstructive Lung Disease), 2024",
    sourceUrl: "https://goldcopd.org/2024-gold-report/",
  },

  // ── Mental health ──────────────────────────────────────────────────
  anxiety_depression: {
    key: "anxiety_depression",
    label: "Anxiety or depression",
    conditionName: "Anxiety or depression",
    medsPrompt: "People managing anxiety or depression are often on one of these. Any yours?",
    medOptions: ["Sertraline (Zoloft)", "Escitalopram (Lexapro)", "Fluoxetine (Prozac)", "Bupropion (Wellbutrin)", "Venlafaxine (Effexor)", "Duloxetine (Cymbalta)", "Alprazolam (Xanax)", "Buspirone"],
    planItems: [
      { id: "therapy", label: "Therapy session in the last month", todoText: "Book a therapy session" },
      { id: "med_checkin", label: "Med check-in with your prescriber in the last 3 months", todoText: "Schedule a med check-in" },
      { id: "labs", label: "Bloodwork (TSH, B12, vitamin D) in the last year", todoText: "Schedule TSH / B12 / vitamin D labs" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can find in-network therapists and book your session.",
      "I can call your prescriber for your med check-in.",
      "I can research side effects worth raising with them.",
    ],
    source: "APA Practice Guidelines + USPSTF Depression and Anxiety Screening",
    sourceUrl: "https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines",
  },

  adhd: {
    key: "adhd",
    label: "ADHD",
    conditionName: "ADHD",
    medsPrompt: "People managing ADHD are often on one of these. Any yours?",
    medOptions: ["Adderall", "Vyvanse", "Concerta", "Ritalin", "Strattera", "Intuniv", "Focalin", "Qelbree"],
    planItems: [
      { id: "med_checkin", label: "Med check-in with your prescriber in the last 3 months", todoText: "Schedule a med check-in" },
      { id: "therapy", label: "Therapy or coaching session in the last month", todoText: "Book a therapy or coaching session" },
      { id: "heart", label: "BP and heart rate check on stimulants", todoText: "Check BP and heart rate on stimulants" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can coordinate your psychiatry and PCP visits.",
      "I can call pharmacies to find your meds in stock.",
      "I can research in-network therapists or coaches.",
    ],
    source: "AAP Clinical Practice Guideline for ADHD + APA Practice Guidelines",
    sourceUrl: "https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines",
  },

  // ── Endocrine ──────────────────────────────────────────────────────
  hypothyroidism: {
    key: "hypothyroidism",
    label: "Thyroid condition",
    conditionName: "Hypothyroidism",
    medsPrompt: "People managing hypothyroidism are often on one of these. Any yours?",
    medOptions: ["Levothyroxine (Synthroid)", "Armour Thyroid", "Cytomel (liothyronine)", "NP Thyroid", "Tirosint"],
    planItems: [
      { id: "tsh", label: "TSH and free T4 in the last year", todoText: "Schedule TSH and free T4 labs" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check blood pressure with your PCP" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can schedule your TSH on the right cadence.",
      "I can call your pharmacy for levothyroxine refills.",
      "I can call your provider about dose changes after results.",
    ],
    source: "ATA Guidelines for the Treatment of Hypothyroidism (2014)",
    sourceUrl: "https://www.thyroid.org/professionals/ata-professional-guidelines/",
  },

  pcos: {
    key: "pcos",
    label: "PCOS",
    conditionName: "PCOS",
    medsPrompt: "For PCOS, any of these in the mix?",
    medOptions: ["Metformin", "Oral contraceptive pill", "Spironolactone", "Inositol", "Ozempic", "Wegovy", "Letrozole (if TTC)", "Clomiphene (if TTC)"],
    planItems: [
      { id: "a1c", label: "A1C or fasting glucose in the last year", todoText: "Schedule an A1C or glucose check" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check blood pressure with your PCP" },
      { id: "obgyn", label: "OB/GYN or endo visit in the last year", todoText: "Schedule an OB/GYN or endo visit" },
    ],
    heroValues: [
      "I can coordinate your OB/GYN and endo visits.",
      "I can call your pharmacy for Metformin or GLP-1 refills.",
      "I can price-shop labs before each visit.",
    ],
    source: "International Evidence-Based Guideline for PCOS (2023)",
    sourceUrl: "https://www.monash.edu/medicine/mchri/pcos/guideline",
  },

  // ── Autoimmune ─────────────────────────────────────────────────────
  rheumatoid_arthritis: {
    key: "rheumatoid_arthritis",
    label: "Rheumatoid arthritis",
    conditionName: "Rheumatoid arthritis",
    medsPrompt: "For rheumatoid arthritis, any of these in the mix?",
    medOptions: ["Methotrexate", "Hydroxychloroquine (Plaquenil)", "Sulfasalazine", "Leflunomide", "Humira (adalimumab)", "Enbrel (etanercept)", "Rinvoq (upadacitinib)", "Prednisone"],
    planItems: [
      { id: "rheum", label: "Rheumatology visit in the last 6 months", todoText: "Schedule a rheumatology visit" },
      { id: "labs", label: "CBC, liver, kidney labs on schedule", todoText: "Schedule monitoring labs" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
      { id: "pneumo", label: "Pneumococcal vaccine if due", todoText: "Check pneumococcal vaccine status" },
      { id: "eye", label: "Annual eye exam (if on Plaquenil)", todoText: "Schedule an eye exam" },
      { id: "bone", label: "Bone density screening if on long-term steroids", todoText: "Book a DEXA scan" },
    ],
    heroValues: [
      "I can schedule your DMARD monitoring labs on time.",
      "I can call your rheumatologist for visits and refills.",
      "I can research vaccine timing around your therapy.",
    ],
    source: "ACR Guideline for the Treatment of Rheumatoid Arthritis (2021)",
    sourceUrl: "https://rheumatology.org/clinician-guidelines",
  },

  lupus: {
    key: "lupus",
    label: "Lupus",
    conditionName: "Systemic lupus erythematosus",
    medsPrompt: "For lupus, any of these in the mix?",
    medOptions: ["Hydroxychloroquine (Plaquenil)", "Methotrexate", "Azathioprine", "Mycophenolate (CellCept)", "Benlysta (belimumab)", "Saphnelo (anifrolumab)", "Prednisone", "Rituximab"],
    planItems: [
      { id: "rheum", label: "Rheumatology visit in the last 3-6 months", todoText: "Schedule a rheumatology visit" },
      { id: "labs", label: "CBC, CMP, urinalysis on schedule", todoText: "Schedule monitoring labs" },
      { id: "eye", label: "Annual eye exam (Plaquenil toxicity screen)", todoText: "Schedule your annual eye exam" },
      { id: "bp", label: "Blood pressure check in the last 3 months", todoText: "Check BP with your PCP" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can schedule monitoring labs on your cadence.",
      "I can coordinate rheum, eye, and PCP visits.",
      "I can research safe vaccine timing with your meds.",
    ],
    source: "ACR Guidelines for Systemic Lupus Erythematosus + EULAR Recommendations",
    sourceUrl: "https://rheumatology.org/clinician-guidelines",
  },

  multiple_sclerosis: {
    key: "multiple_sclerosis",
    label: "Multiple sclerosis",
    conditionName: "Multiple sclerosis",
    medsPrompt: "For MS, any disease-modifying therapies in the mix?",
    medOptions: ["Ocrevus (ocrelizumab)", "Kesimpta (ofatumumab)", "Tysabri (natalizumab)", "Tecfidera (dimethyl fumarate)", "Gilenya (fingolimod)", "Copaxone (glatiramer)", "Aubagio (teriflunomide)", "Mavenclad (cladribine)"],
    planItems: [
      { id: "neuro", label: "Neurology visit in the last 6 months", todoText: "Schedule a neurology visit" },
      { id: "mri", label: "MRI on schedule", todoText: "Schedule your MRI" },
      { id: "labs", label: "Monitoring labs per DMT", todoText: "Schedule monitoring labs" },
      { id: "vitamin_d", label: "Vitamin D check in the last year", todoText: "Schedule a vitamin D lab" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can call about MRI scheduling and infusion dates.",
      "I can coordinate neurology, PT, and PCP visits.",
      "I can research vaccine timing with your DMT.",
    ],
    source: "AAN Practice Guideline for MS Disease-Modifying Therapies + National MS Society",
    sourceUrl: "https://www.nationalmssociety.org/For-Professionals/Clinical-Care/Clinical-Care-Guidelines",
  },

  ibd: {
    key: "ibd",
    label: "Crohn's or ulcerative colitis",
    conditionName: "Inflammatory bowel disease",
    medsPrompt: "For IBD, any of these in the mix?",
    medOptions: ["Mesalamine (Asacol, Lialda)", "Humira (adalimumab)", "Remicade (infliximab)", "Stelara (ustekinumab)", "Entyvio (vedolizumab)", "Rinvoq (upadacitinib)", "Azathioprine", "Prednisone"],
    planItems: [
      { id: "gi", label: "GI visit in the last 6 months", todoText: "Schedule a GI visit" },
      { id: "labs", label: "CBC, CMP, CRP on schedule", todoText: "Schedule monitoring labs" },
      { id: "colonoscopy", label: "Colonoscopy on cadence (risk-based)", todoText: "Ask about colonoscopy timing" },
      { id: "bone", label: "Bone density screening if on steroids", todoText: "Book a DEXA scan" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can schedule your infusions and monitoring labs.",
      "I can coordinate GI, imaging, and PCP visits.",
      "I can research biologic copay assistance programs.",
    ],
    source: "ACG Clinical Guidelines for Crohn's Disease and Ulcerative Colitis",
    sourceUrl: "https://gi.org/guidelines/",
  },

  psoriasis: {
    key: "psoriasis",
    label: "Psoriasis",
    conditionName: "Psoriasis",
    medsPrompt: "For psoriasis, any of these in the mix?",
    medOptions: ["Topical steroids", "Calcipotriene", "Methotrexate", "Cyclosporine", "Humira (adalimumab)", "Skyrizi (risankizumab)", "Taltz (ixekizumab)", "Otezla (apremilast)"],
    planItems: [
      { id: "derm", label: "Dermatology visit in the last 6-12 months", todoText: "Schedule a dermatology visit" },
      { id: "labs", label: "Monitoring labs per therapy", todoText: "Schedule monitoring labs" },
      { id: "cardio", label: "BP, lipid, glucose check annually", todoText: "Schedule cardiometabolic labs" },
    ],
    heroValues: [
      "I can schedule derm follow-ups and biologic doses.",
      "I can research copay assistance for biologics.",
      "I can flag comorbidities worth raising with your PCP.",
    ],
    source: "AAD / NPF Joint Guidelines for the Management of Psoriasis",
    sourceUrl: "https://www.aad.org/member/clinical-quality/guidelines/psoriasis",
  },

  // ── Musculoskeletal / recovery ─────────────────────────────────────
  injury_recovery: {
    key: "injury_recovery",
    label: "Injury recovery",
    conditionName: "Injury recovery",
    medsPrompt: "For pain or inflammation, any of these in the mix?",
    medOptions: ["Ibuprofen (Advil, Motrin)", "Acetaminophen (Tylenol)", "Naproxen (Aleve)", "Cyclobenzaprine (Flexeril)", "Lidocaine patch", "Tramadol", "Meloxicam"],
    planItems: [
      { id: "pt_eval", label: "Physical therapy evaluation in the last month", todoText: "Book a PT evaluation" },
      { id: "pt_session", label: "PT session this week", todoText: "Schedule your next PT session" },
      { id: "imaging", label: "Imaging follow-up if ordered", todoText: "Follow up on imaging results" },
      { id: "pcp", label: "PCP or specialist check-in on progress", todoText: "Check in with your PCP on recovery" },
    ],
    heroValues: [
      "I can find in-network PT and book your sessions.",
      "I can call about imaging and follow-up appointments.",
      "I can coordinate updates between PT and your PCP.",
    ],
    source: "APTA Clinical Practice Guidelines + AAOS Musculoskeletal Care Recommendations",
    sourceUrl: "https://www.apta.org/patient-care/evidence-based-practice-resources/cpgs",
  },

  post_surgery: {
    key: "post_surgery",
    label: "Post-surgery recovery",
    conditionName: "Post-surgery recovery",
    medsPrompt: "For pain and recovery, any of these in the mix?",
    medOptions: ["Acetaminophen (Tylenol)", "Ibuprofen (Advil, Motrin)", "Oxycodone", "Tramadol", "Gabapentin", "Docusate (stool softener)", "Ondansetron (Zofran)"],
    planItems: [
      { id: "surgeon_followup", label: "Follow-up with your surgeon", todoText: "Book your surgical follow-up" },
      { id: "pt", label: "Physical therapy if ordered", todoText: "Schedule post-op PT" },
      { id: "imaging", label: "Follow-up imaging if needed", todoText: "Schedule post-op imaging" },
      { id: "activity", label: "Activity clearance from your surgeon", todoText: "Get activity clearance before RTS" },
      { id: "pcp", label: "PCP check-in on recovery", todoText: "Loop your PCP in on recovery" },
    ],
    heroValues: [
      "I can call your surgeon's office for follow-ups.",
      "I can schedule post-op PT and imaging.",
      "I can loop your PCP in on your recovery.",
    ],
    source: "ERAS Society Guidelines (Enhanced Recovery After Surgery)",
    sourceUrl: "https://erassociety.org/guidelines/",
  },

  osteoporosis: {
    key: "osteoporosis",
    label: "Osteoporosis",
    conditionName: "Osteoporosis",
    medsPrompt: "For osteoporosis, any of these in the mix?",
    medOptions: ["Alendronate (Fosamax)", "Risedronate (Actonel)", "Zoledronic acid (Reclast)", "Prolia (denosumab)", "Evenity (romosozumab)", "Forteo (teriparatide)", "Calcium supplement", "Vitamin D supplement"],
    planItems: [
      { id: "dexa", label: "DEXA scan every 1-2 years", todoText: "Schedule a DEXA scan" },
      { id: "dental", label: "Dental check before starting bisphosphonates", todoText: "Book a dental clearance" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can schedule your next DEXA.",
      "I can call your pharmacy for Prolia or Evenity.",
      "I can coordinate dental clearance before med changes.",
    ],
    source: "Bone Health & Osteoporosis Foundation Clinician's Guide + AACE/ACE Guidelines",
    sourceUrl: "https://www.bonehealthandosteoporosis.org/clinicians/",
  },

  // ── Women's health ─────────────────────────────────────────────────
  pregnancy: {
    key: "pregnancy",
    label: "Pregnancy",
    conditionName: "Pregnancy",
    medsPrompt: "Taking any of these during pregnancy?",
    medOptions: ["Prenatal vitamin", "Folic acid", "Iron supplement", "Unisom (doxylamine)", "Zofran (ondansetron)", "Pepcid (famotidine)", "Acetaminophen (Tylenol)"],
    planItems: [
      { id: "first_visit", label: "First prenatal visit (8-10 weeks)", todoText: "Book your first prenatal visit" },
      { id: "nt_scan", label: "NT scan and first-trimester screening (10-13 weeks)", todoText: "Schedule NT scan" },
      { id: "anatomy", label: "Anatomy scan (around 20 weeks)", todoText: "Schedule your anatomy scan" },
      { id: "glucose", label: "Glucose tolerance test (24-28 weeks)", todoText: "Schedule glucose tolerance test" },
      { id: "tdap", label: "Tdap shot (27-36 weeks)", todoText: "Book your Tdap shot" },
      { id: "gbs", label: "GBS swab (35-37 weeks)", todoText: "Schedule GBS swab" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can schedule every prenatal visit and screening.",
      "I can call hospitals and doulas to check in-network.",
      "I can set up your postpartum follow-up plan.",
    ],
    source: "ACOG Committee Opinions + CDC Maternal Immunization Guidance",
    sourceUrl: "https://www.acog.org/clinical",
  },

  fertility_ivf: {
    key: "fertility_ivf",
    label: "Fertility / IVF",
    conditionName: "Fertility / IVF",
    medsPrompt: "Any fertility meds part of the plan right now?",
    medOptions: ["Gonal-F", "Follistim", "Menopur", "Cetrotide", "Ganirelix", "Lupron", "Progesterone", "Prenatal vitamin"],
    planItems: [
      { id: "repro_visit", label: "Reproductive endocrinology visit on schedule", todoText: "Book your next fertility visit" },
      { id: "baseline", label: "Baseline ultrasound and labs on cycle schedule", todoText: "Schedule baseline ultrasound and labs" },
      { id: "monitoring", label: "Monitoring appointments booked during your cycle", todoText: "Schedule fertility monitoring appointments" },
      { id: "procedure", label: "Egg retrieval, transfer, or IUI timing confirmed", todoText: "Confirm fertility procedure timing" },
      { id: "coverage", label: "Coverage, prior auth, and med approval checked", todoText: "Check fertility coverage and prior authorization" },
    ],
    heroValues: [
      "I can coordinate your fertility monitoring appointments.",
      "I can call your insurance about IVF coverage and prior auth.",
      "I can price-shop fertility meds, labs, and procedures.",
    ],
    source: "ASRM Committee Opinions + SART patient guidance",
    sourceUrl: "https://www.asrm.org/practice-guidance/",
  },

  menopause: {
    key: "menopause",
    label: "Menopause",
    conditionName: "Menopause / perimenopause",
    medsPrompt: "For menopause, any of these in the mix?",
    medOptions: ["Estradiol patch or oral", "Progesterone (oral, micronized)", "Veozah (fezolinetant)", "Vaginal estrogen (Estrace, Vagifem)", "SSRIs (for hot flashes)", "Gabapentin", "Clonidine", "Lubricant / moisturizer"],
    planItems: [
      { id: "obgyn", label: "OB/GYN visit in the last year", todoText: "Schedule an OB/GYN visit" },
      { id: "bone", label: "Bone density screening (DEXA) at 65+ or earlier if risk", todoText: "Book a DEXA scan" },
      { id: "mammo", label: "Mammogram on schedule", todoText: "Schedule a mammogram" },
      { id: "pap", label: "Cervical cancer screening on schedule", todoText: "Schedule your Pap test" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
    ],
    heroValues: [
      "I can schedule OB/GYN, DEXA, and mammography.",
      "I can research HRT options and in-network pharmacies.",
      "I can call about compounded HRT coverage.",
    ],
    source: "Menopause Society (NAMS) Position Statement on Hormone Therapy (2022)",
    sourceUrl: "https://menopause.org/professional-resources/position-statements",
  },

  // ── Neurological ───────────────────────────────────────────────────
  migraine: {
    key: "migraine",
    label: "Migraine",
    conditionName: "Migraine",
    medsPrompt: "For migraines, any of these in the mix?",
    medOptions: ["Sumatriptan (Imitrex)", "Rizatriptan (Maxalt)", "Ubrelvy (ubrogepant)", "Nurtec (rimegepant)", "Excedrin Migraine", "Topamax (topiramate)", "Propranolol", "Magnesium"],
    planItems: [
      { id: "neuro", label: "Neurology visit in the last year", todoText: "Schedule a neurology visit" },
      { id: "preventive", label: "Preventive med review if 4+ migraines/month", todoText: "Review preventive options with your doctor" },
      { id: "eye", label: "Eye exam in the last 2 years", todoText: "Schedule an eye exam" },
    ],
    heroValues: [
      "I can call your neurologist for visits and med reviews.",
      "I can price-shop triptans and new CGRP meds.",
      "I can research preventive options covered by your plan.",
    ],
    source: "American Headache Society Consensus Statement on Migraine (2021)",
    sourceUrl: "https://americanheadachesociety.org/resources/guidelines/",
  },

  stroke_recovery: {
    key: "stroke_recovery",
    label: "Stroke / stroke recovery",
    conditionName: "Stroke recovery",
    medsPrompt: "Any of these part of recovery right now?",
    medOptions: ["Aspirin", "Clopidogrel (Plavix)", "Atorvastatin", "Rosuvastatin", "Lisinopril", "Amlodipine", "Apixaban (Eliquis)", "Warfarin"],
    planItems: [
      { id: "neuro", label: "Neurology follow-up on schedule", todoText: "Schedule a neurology follow-up" },
      { id: "rehab", label: "PT, OT, or speech therapy booked", todoText: "Book PT, OT, or speech therapy" },
      { id: "pcp", label: "PCP or rehab medicine check-in booked", todoText: "Schedule a PCP or rehab follow-up" },
      { id: "imaging", label: "Follow-up imaging or cardiac workup if ordered", todoText: "Follow up on stroke imaging or heart testing" },
      { id: "meds", label: "Secondary-prevention meds reviewed and refilled", todoText: "Stay ahead of stroke prevention med refills" },
    ],
    heroValues: [
      "I can coordinate neurology, rehab, and PCP follow-ups.",
      "I can call about stroke imaging, testing, and next steps.",
      "I can keep your stroke prevention meds and refills on track.",
    ],
    source: "AHA/ASA Guideline for Adult Stroke Rehabilitation and Recovery + Secondary Stroke Prevention Guideline",
    sourceUrl: "https://www.stroke.org/en/professionals/stroke-resource-library/prevention",
  },

  epilepsy: {
    key: "epilepsy",
    label: "Epilepsy",
    conditionName: "Epilepsy",
    medsPrompt: "For epilepsy, any of these in the mix?",
    medOptions: ["Keppra (levetiracetam)", "Lamictal (lamotrigine)", "Depakote (valproate)", "Tegretol (carbamazepine)", "Briviact (brivaracetam)", "Vimpat (lacosamide)", "Topamax (topiramate)", "Onfi (clobazam)"],
    planItems: [
      { id: "neuro", label: "Neurology visit in the last 6 months", todoText: "Schedule a neurology visit" },
      { id: "levels", label: "Drug level labs if applicable", todoText: "Schedule a drug level check" },
      { id: "driving", label: "Driving status reviewed with your doctor", todoText: "Confirm driving status with neuro" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can call your neurologist to book visits and labs.",
      "I can call your pharmacy for AED refills.",
      "I can handle driving clearance paperwork with neurology.",
    ],
    source: "AAN Practice Guideline on Antiepileptic Drug Treatment",
    sourceUrl: "https://www.aan.com/Guidelines/home/ByTopic?topicId=15",
  },

  dementia: {
    key: "dementia",
    label: "Dementia / Alzheimer's",
    conditionName: "Dementia",
    medsPrompt: "Any of these in the mix for the person you're caring for?",
    medOptions: ["Donepezil (Aricept)", "Rivastigmine (Exelon)", "Galantamine (Razadyne)", "Memantine (Namenda)", "Leqembi (lecanemab)", "Trazodone (sleep)", "Risperidone", "SSRI"],
    planItems: [
      { id: "neuro_geri", label: "Neurology or geriatrics visit in the last 6 months", todoText: "Schedule a neuro or geriatrics visit" },
      { id: "pcp", label: "PCP check-in in the last 6 months", todoText: "Schedule a PCP visit" },
      { id: "caregiver_support", label: "Caregiver support group or therapy", todoText: "Find a caregiver support group" },
      { id: "flu", label: "Flu shot this season", todoText: "Book this season's flu shot" },
    ],
    heroValues: [
      "I can coordinate neuro and PCP visits for your loved one.",
      "I can research in-network caregiver resources.",
      "I can flag med interactions worth discussing.",
    ],
    source: "Alzheimer's Association Clinical Practice Guidelines + AAN Dementia Guidelines",
    sourceUrl: "https://www.alz.org/professionals/health-systems-clinicians/clinical-resources",
  },

  // ── Sleep ──────────────────────────────────────────────────────────
  sleep_apnea: {
    key: "sleep_apnea",
    label: "Sleep apnea",
    conditionName: "Obstructive sleep apnea",
    medsPrompt: "Anything supporting sleep or related?",
    medOptions: ["CPAP (not a med)", "BiPAP (not a med)", "Oral appliance", "Nasal spray", "Not on meds"],
    planItems: [
      { id: "sleep_study", label: "Sleep study in the last 2-5 years", todoText: "Ask about a follow-up sleep study" },
      { id: "ent", label: "ENT visit if device not tolerated", todoText: "Ask for an ENT referral" },
      { id: "weight", label: "Weight check with your PCP", todoText: "Book a weight check with your PCP" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check BP with your PCP" },
    ],
    heroValues: [
      "I can schedule sleep studies and follow-ups.",
      "I can call when CPAP supplies are due to replace.",
      "I can check insurance coverage for device changes.",
    ],
    source: "AASM Clinical Practice Guideline for Treatment of Obstructive Sleep Apnea",
    sourceUrl: "https://aasm.org/clinical-resources/practice-standards/practice-guidelines/",
  },

  insomnia: {
    key: "insomnia",
    label: "Insomnia",
    conditionName: "Insomnia",
    medsPrompt: "For sleep, any of these in the mix?",
    medOptions: ["Melatonin", "Trazodone", "Zolpidem (Ambien)", "Eszopiclone (Lunesta)", "Doxepin", "Belsomra (suvorexant)", "Quviviq (daridorexant)", "Magnesium"],
    planItems: [
      { id: "cbti", label: "CBT-I program enrollment (first-line)", todoText: "Enroll in a CBT-I program" },
      { id: "mental_health", label: "Mental health check-in if anxiety or depression", todoText: "Book a mental health check-in" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can find an in-network CBT-I provider and book it.",
      "I can coordinate mental health and PCP visits.",
      "I can research med interactions worth discussing.",
    ],
    source: "AASM Clinical Practice Guideline for Insomnia (2017) + Behavioral Treatment Guideline",
    sourceUrl: "https://aasm.org/clinical-resources/practice-standards/practice-guidelines/",
  },

  // ── GI ─────────────────────────────────────────────────────────────
  gerd: {
    key: "gerd",
    label: "GERD / acid reflux",
    conditionName: "GERD",
    medsPrompt: "For reflux, any of these in the mix?",
    medOptions: ["Omeprazole (Prilosec)", "Esomeprazole (Nexium)", "Pantoprazole (Protonix)", "Famotidine (Pepcid)", "Ranitidine alternatives", "Tums / antacids", "Sucralfate (Carafate)", "Reglan"],
    planItems: [
      { id: "gi", label: "GI visit if symptoms uncontrolled", todoText: "Schedule a GI visit" },
      { id: "ppi_review", label: "PPI dose reviewed annually", todoText: "Review PPI use with your PCP" },
      { id: "endoscopy", label: "Endoscopy if red flags present", todoText: "Ask about an endoscopy" },
    ],
    heroValues: [
      "I can price-shop PPIs and find OTC equivalents.",
      "I can coordinate GI visits if symptoms don't settle.",
      "I can call about endoscopy scheduling.",
    ],
    source: "ACG Clinical Guideline for GERD (2022)",
    sourceUrl: "https://gi.org/guidelines/",
  },

  ibs: {
    key: "ibs",
    label: "IBS",
    conditionName: "Irritable bowel syndrome",
    medsPrompt: "For IBS, any of these in the mix?",
    medOptions: ["Fiber supplement (psyllium)", "Loperamide (Imodium)", "Hyoscyamine (Levsin)", "Dicyclomine (Bentyl)", "Linzess (linaclotide)", "Trulance (plecanatide)", "Rifaximin (Xifaxan)", "Peppermint oil"],
    planItems: [
      { id: "gi", label: "GI visit if symptoms uncontrolled", todoText: "Schedule a GI visit" },
      { id: "fodmap", label: "Low-FODMAP trial with dietitian", todoText: "Book a low-FODMAP dietitian consult" },
      { id: "mental_health", label: "Mental health check-in (gut-brain)", todoText: "Book a mental health check-in" },
      { id: "screen", label: "Colon cancer screen on age schedule", todoText: "Confirm colon cancer screening status" },
    ],
    heroValues: [
      "I can find a GI-savvy dietitian in-network.",
      "I can coordinate GI and mental health visits.",
      "I can call about colon cancer screening timing.",
    ],
    source: "ACG Clinical Guideline for IBS (2021)",
    sourceUrl: "https://gi.org/guidelines/",
  },

  // ── Cancer (generic; agent narrows subtype in chat) ────────────────
  cancer: {
    key: "cancer",
    label: "Cancer",
    conditionName: "Cancer",
    medsPrompt: "What meds are part of your treatment right now?",
    medOptions: ["Ondansetron (Zofran)", "Dexamethasone", "Acetaminophen (Tylenol)", "Oxycodone", "Lorazepam (Ativan)", "Docusate (stool softener)", "Hormone therapy (e.g. tamoxifen)", "Immunotherapy infusion"],
    planItems: [
      { id: "oncology", label: "Oncology visit on schedule", todoText: "Schedule your next oncology visit" },
      { id: "imaging", label: "Imaging (CT / MRI / PET) on schedule", todoText: "Schedule surveillance imaging" },
      { id: "labs", label: "CBC and CMP on treatment schedule", todoText: "Schedule bloodwork" },
      { id: "dental", label: "Dental clearance before / during treatment", todoText: "Book a dental clearance" },
      { id: "mental_health", label: "Mental health or social work support this month", todoText: "Book a mental health or social work visit" },
      { id: "pcp", label: "PCP check-in for non-cancer care", todoText: "Loop your PCP in on non-cancer care" },
      { id: "genetics", label: "Genetic counseling if relevant", todoText: "Ask about genetic counseling" },
    ],
    heroValues: [
      "I can call your oncology team for visits and imaging.",
      "I can coordinate your PCP with your oncology team.",
      "I can research support services and price-shop non-oncology care.",
    ],
    source: "NCCN Clinical Practice Guidelines in Oncology + ACS Survivorship Guidelines",
    sourceUrl: "https://www.nccn.org/guidelines/category_1",
  },

  // ── Category fallbacks ─────────────────────────────────────────────
  chronic_condition_fallback: {
    key: "chronic_condition_fallback",
    label: "A long-term condition",
    conditionName: "Chronic condition",
    medsPrompt: "Any daily meds you're on?",
    medOptions: ["Not on any meds", "Other"],
    planItems: [
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
      { id: "bp", label: "Blood pressure check in the last 6 months", todoText: "Check BP with your PCP" },
      { id: "lipid", label: "Lipid panel in the last year", todoText: "Schedule a lipid panel" },
      { id: "glucose", label: "A1C or fasting glucose in the last year", todoText: "Schedule an A1C or glucose check" },
    ],
    heroValues: [
      "I can call your PCP to book your annual physical.",
      "I can coordinate labs and follow-ups.",
      "I can price-shop refills and visits.",
    ],
    source: "USPSTF Recommendations for Preventive Services in Adults",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics",
    fallback: true,
  },

  recovery_fallback: {
    key: "recovery_fallback",
    label: "Recovery or rehab",
    conditionName: "Recovery",
    medsPrompt: "For pain or recovery, any of these in the mix?",
    medOptions: ["Ibuprofen (Advil, Motrin)", "Acetaminophen (Tylenol)", "Naproxen (Aleve)", "Not on any meds"],
    planItems: [
      { id: "pt", label: "PT or OT evaluation this month", todoText: "Book a PT or OT evaluation" },
      { id: "pcp", label: "PCP check-in on recovery", todoText: "Check in with your PCP" },
      { id: "imaging", label: "Imaging follow-up if ordered", todoText: "Follow up on imaging results" },
    ],
    heroValues: [
      "I can find in-network PT and book your sessions.",
      "I can call about imaging and follow-ups.",
      "I can coordinate PT updates with your PCP.",
    ],
    source: "APTA Clinical Practice Guidelines",
    sourceUrl: "https://www.apta.org/patient-care/evidence-based-practice-resources/cpgs",
    fallback: true,
  },

  mental_health_fallback: {
    key: "mental_health_fallback",
    label: "Mental health",
    conditionName: "Mental health",
    medsPrompt: "On any daily meds for this?",
    medOptions: ["Not on any meds", "Other"],
    planItems: [
      { id: "therapy", label: "Therapy session in the last month", todoText: "Book a therapy session" },
      { id: "med_checkin", label: "Med check-in if prescribed", todoText: "Schedule a med check-in" },
      { id: "physical", label: "Annual physical in the last year", todoText: "Book your annual physical" },
    ],
    heroValues: [
      "I can find in-network therapists and book sessions.",
      "I can call your prescriber for med check-ins.",
      "I can research side effects worth raising.",
    ],
    source: "APA Practice Guidelines + USPSTF Mental Health Screening Recommendations",
    sourceUrl: "https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines",
    fallback: true,
  },

  new_diagnosis_fallback: {
    key: "new_diagnosis_fallback",
    label: "Something I was just diagnosed with",
    conditionName: "Recent diagnosis",
    medsPrompt: "Any new meds you've started?",
    medOptions: ["Not on any meds yet", "Other"],
    planItems: [
      { id: "specialist", label: "First specialist visit booked", todoText: "Book your first specialist visit" },
      { id: "baseline_labs", label: "Baseline labs on schedule", todoText: "Schedule baseline labs" },
    ],
    heroValues: [
      "I can book your first specialist visit.",
      "I can schedule baseline labs in-network.",
      "I can pull together questions for your next visit.",
    ],
    source: "USPSTF Preventive Services + patient-education resources from the cited condition-specific society",
    sourceUrl: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics",
    fallback: true,
  },
};

export type SituationChip = {
  key: string;
  label: string;
  hasTemplate: boolean;
  conditionName: string | null;
};

// Order by US adult prevalence so the most likely pick is highest.
// Approximate prevalence: hypertension ~48%, anxiety/depression combined
// ~19%, type 2 diabetes ~11%. Injury recovery is lower-prevalence but
// kept visible because it's a distinct mental model.
export const SITUATION_CHIPS: SituationChip[] = [
  { key: "hypertension", label: "High blood pressure", hasTemplate: true, conditionName: "Hypertension" },
  { key: "anxiety_depression", label: "Anxiety or depression", hasTemplate: true, conditionName: "Anxiety or depression" },
  { key: "t2_diabetes", label: "Type 2 diabetes", hasTemplate: true, conditionName: "Type 2 diabetes" },
  { key: "fertility_ivf", label: "Fertility / IVF", hasTemplate: true, conditionName: "Fertility / IVF" },
  { key: "other", label: "Something else", hasTemplate: false, conditionName: null },
];

export const CONDITION_ALIASES: Record<string, string[]> = {
  t2_diabetes: ["diabetes", "t2d", "type 2 diabetes", "type 2", "type ii diabetes", "blood sugar", "diabetic"],
  hypertension: ["high blood pressure", "htn", "hypertension", "bp", "high bp"],
  high_cholesterol: ["high cholesterol", "cholesterol", "statin", "hyperlipidemia"],
  anxiety_depression: ["anxiety", "depression", "panic", "panic attacks", "depressed", "anxious", "sad"],
  prediabetes: ["prediabetes", "pre-diabetes", "pre diabetes", "borderline diabetes"],
  obesity: ["obesity", "weight", "overweight", "weight loss", "wegovy", "zepbound", "glp-1", "glp1", "bariatric"],
  atrial_fibrillation: ["afib", "a-fib", "a fib", "atrial fibrillation", "arrhythmia", "irregular heartbeat"],
  heart_failure: ["heart failure", "chf", "congestive heart failure", "cardiomyopathy"],
  asthma: ["asthma", "wheezing", "inhaler"],
  allergies: ["allergies", "hay fever", "seasonal allergies", "allergic rhinitis", "allergic"],
  copd: ["copd", "emphysema", "chronic bronchitis"],
  adhd: ["adhd", "add", "attention deficit", "attention"],
  hypothyroidism: ["hypothyroid", "hypothyroidism", "thyroid", "low thyroid", "hashimoto's", "hashimoto", "hashimotos", "levothyroxine", "synthroid"],
  pcos: ["pcos", "polycystic ovary", "polycystic ovarian"],
  rheumatoid_arthritis: ["ra", "rheumatoid", "rheumatoid arthritis"],
  lupus: ["lupus", "sle", "systemic lupus"],
  multiple_sclerosis: ["ms", "multiple sclerosis", "demyelinating"],
  ibd: ["crohn's", "crohns", "crohn", "ulcerative colitis", "uc", "ibd", "inflammatory bowel"],
  psoriasis: ["psoriasis", "plaque psoriasis", "psoriatic"],
  injury_recovery: ["injury", "sprain", "strain", "tear", "acl", "rotator cuff", "back pain", "knee pain", "shoulder pain", "pt", "physical therapy", "sciatica", "meniscus"],
  post_surgery: ["post surgery", "surgery", "post-op", "post op", "recovery from surgery", "after surgery", "surgical recovery"],
  osteoporosis: ["osteoporosis", "bone density", "osteopenia", "fragile bones"],
  pregnancy: ["pregnant", "pregnancy", "prenatal", "postpartum", "post-partum", "expecting", "expecting a baby", "ttc"],
  fertility_ivf: ["fertility", "ivf", "iui", "egg retrieval", "embryo transfer", "embryo", "stims", "stim cycle", "fertility treatment", "reproductive endocrinology", "reproductive endocrinologist", "infertility", "trying to conceive", "ttc", "frozen embryo transfer", "fet"],
  menopause: ["menopause", "perimenopause", "peri-menopause", "hot flashes", "hrt"],
  migraine: ["migraine", "migraines", "headache", "headaches", "chronic headache"],
  stroke_recovery: ["stroke", "tia", "mini stroke", "brain bleed", "cva", "post stroke", "after stroke", "stroke recovery", "rehab after stroke"],
  epilepsy: ["epilepsy", "seizures", "seizure disorder", "seizure"],
  dementia: ["dementia", "alzheimer's", "alzheimers", "alzheimer", "alz", "cognitive decline", "memory loss"],
  sleep_apnea: ["sleep apnea", "osa", "cpap", "snoring"],
  insomnia: ["insomnia", "cannot sleep", "can't sleep", "cant sleep", "trouble sleeping", "bad sleep"],
  gerd: ["gerd", "acid reflux", "reflux", "heartburn"],
  ibs: ["ibs", "irritable bowel", "irritable bowel syndrome"],
  cancer: ["cancer", "chemo", "chemotherapy", "oncology", "breast cancer", "prostate cancer", "colon cancer", "lung cancer", "lymphoma", "leukemia", "melanoma", "ovarian cancer", "skin cancer", "cervical cancer", "uterine cancer", "thyroid cancer", "pancreatic cancer", "kidney cancer", "bladder cancer", "tumor", "malignancy"],
};

export function getTemplate(key: string | null): SituationTemplate | null {
  if (!key) return null;
  return SITUATION_TEMPLATES[key] ?? null;
}

export function getChip(key: string | null): SituationChip | null {
  if (!key) return null;
  return SITUATION_CHIPS.find((c) => c.key === key) ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Short aliases (≤4 chars) like "ra", "ms", "uc", "sle", "pt", "htn" raw-substring
// match inside unrelated words ("ra" → "brain", "ms" → "items"), so for those we
// require a word-boundary match. Mirrors backend `_alias_matches` in care_plans.py.
function aliasMatches(alias: string, q: string): boolean {
  if (alias.length <= 4) {
    return new RegExp(`\\b${escapeRegex(alias)}\\b`).test(q);
  }
  return q.includes(alias) || alias.includes(q);
}

export function findTemplateByAlias(query: string): SituationTemplate | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;
  for (const [templateKey, aliases] of Object.entries(CONDITION_ALIASES)) {
    for (const alias of aliases) {
      if (aliasMatches(alias, q)) {
        return SITUATION_TEMPLATES[templateKey] ?? null;
      }
    }
  }
  return null;
}
