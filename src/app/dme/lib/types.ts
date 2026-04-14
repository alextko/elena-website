export interface DmeAnswers {
  // Equipment (step 1)
  equipmentType: string;
  urgency: "routine" | "soon" | "urgent" | "";
  equipmentNotes: string;

  // Patient identity (step 2)
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;

  // Shipping address (step 3)
  shippingStreet: string;
  shippingApt: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;

  // Insurance (step 4)
  insuranceProvider: string;
  insuranceMemberId: string;
  insuranceGroupNumber: string;
  insurancePlanType: string;
  insuranceZip: string;

  // Medical (step 5)
  hasDiagnosis: boolean | null;
  conditionDescription: string;
  hasPrescription: boolean | null;
  prescribingDoctorName: string;
  prescribingDoctorPhone: string;

  // Provider (step 6)
  doctorClinicName: string;
  doctorPhone: string;
  doctorFax: string;

  // Delivery (step 7)
  deliveryTiming: "asap" | "within_week" | "within_month" | "flexible" | "";
  mobilityIssues: boolean | null;
  accessNotes: string;
}

export const INITIAL_DME_ANSWERS: DmeAnswers = {
  equipmentType: "",
  urgency: "",
  equipmentNotes: "",
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  email: "",
  shippingStreet: "",
  shippingApt: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
  insuranceProvider: "",
  insuranceMemberId: "",
  insuranceGroupNumber: "",
  insurancePlanType: "",
  insuranceZip: "",
  hasDiagnosis: null,
  conditionDescription: "",
  hasPrescription: null,
  prescribingDoctorName: "",
  prescribingDoctorPhone: "",
  doctorClinicName: "",
  doctorPhone: "",
  doctorFax: "",
  deliveryTiming: "",
  mobilityIssues: null,
  accessNotes: "",
};

export const DME_EQUIPMENT_OPTIONS = [
  "CPAP / BiPAP Machine",
  "Wheelchair",
  "Hospital Bed",
  "Breast Pump",
  "Oxygen Equipment",
  "Walker / Rollator",
  "Knee Scooter",
  "Nebulizer",
  "Glucose Monitor / CGM",
  "Prosthetics / Orthotics",
  "Compression Stockings",
  "Other",
];

export type DmeStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export const TOTAL_QUESTION_STEPS = 8; // steps 1-7 + confirmation, not counting intro/teaser

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export const INSURANCE_PROVIDERS = [
  "Aetna",
  "Anthem / Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "Medicare Advantage",
  "Molina Healthcare",
  "Oscar Health",
  "UnitedHealthcare",
  "VA / TRICARE",
  "Other",
];
