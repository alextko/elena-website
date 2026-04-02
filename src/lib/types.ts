// --- Chat Send / Poll (api_chat_poll.py) ---

export interface SendChatResponse {
  chat_request_id: string;
  session_id: string;
}

export interface PollResponse {
  chat_request_id: string;
  phase: "processing" | "completed" | "failed";
  tool_label: string | null;
  tool_step: number;
  elapsed_seconds: number;
  result?: ChatResponse;
  error?: string;
}

// --- Chat Response (api_chat.py:223-236) ---

export interface ChatResponse {
  reply: string;
  session_id: string;
  suggestions?: string[] | null;
  booking_id?: string | null;
  doctor_results?: DoctorResult[] | null;
  review_results?: ReviewResult | null;
  web_sources?: SourcePayload[] | null;
  location_results?: LocationResult[] | null;
  profile_updates?: Record<string, string> | null;
  error_code?: string | null;
  upgrade_url?: string | null;
  gated_feature?: string | null;
  form_request?: FormRequest | null;
}

// --- Session History (api_chat.py:480-485) ---

export interface ChatSessionItem {
  id: string;
  title: string | null;
  preview: string | null;
  created_at: string;
  updated_at: string;
}

// --- Message History (api_chat.py:565-574) ---

export interface ChatMessageItem {
  role: string;
  text: string;
  created_at: string;
  doctor_results?: DoctorResult[] | null;
  review_results?: ReviewResult | null;
  booking_result?: BookingResultPayload | null;
  location_results?: LocationResult[] | null;
  bill_analysis?: BillAnalysis | null;
  negotiation_result?: NegotiationResult | null;
  web_sources?: SourcePayload[] | null;
  form_request?: FormRequest | null;
}

// --- Welcome (api_chat.py:275-279) ---

export interface WelcomeResponse {
  message: string;
  heading: string;
  suggestions: string[];
  session_id: string;
}

// --- Auth (api_auth.py:42-59) ---

export interface ProfileSummary {
  id: string;
  label: string;
  relationship: string;
  first_name: string;
  last_name: string;
  is_primary: boolean;
  is_linked: boolean;
  profile_picture_url?: string | null;
}

export interface MeResponse {
  auth_user_id: string;
  profile_id: string | null;
  email: string | null;
  has_profile: boolean;
  onboarding_completed: boolean;
  profiles: ProfileSummary[];
}

// --- Subscription (api_web.py) ---

export interface SubscriptionResponse {
  plan: string;
  tier: string;  // free / standard / premium
  status: string;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
}

// --- Structured result payloads ---

export interface DoctorResult {
  name: string;
  specialty: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone_number?: string | null;
  npi_number?: string | null;
  in_network?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  negotiated_rate?: number | null;
  estimated_total?: number | null;
  estimated_oop?: number | null;
  facility_type?: string | null;
  healthgrades_rating?: number | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  distance_km?: number | null;
  practice_name?: string | null;
}

export interface LocationResult {
  name: string;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  review_count?: number | null;
  distance_km?: number | null;
  in_network?: boolean | null;
  providers?: string[] | null;
}

export interface SourcePayload {
  url: string;
  title: string;
}

export interface ReviewPayload {
  text: string;
  date?: string | null;
  rating?: number | null;
}

export interface ReviewResult {
  doctor_name: string;
  healthgrades_rating?: number | null;
  reviews: ReviewPayload[];
}

export interface BookingResult {
  booking_id: string;
  status: string;
  provider_name: string;
  provider_specialty?: string | null;
  confirmed_date?: string | null;
  confirmed_time?: string | null;
  reason_for_visit?: string | null;
}

export interface BillAnalysis {
  items: { description: string; charged: number; fair_price: number; potential_savings: number }[];
  total_potential_savings: number;
}

export interface NegotiationResult {
  provider_name: string;
  provider_phone: string;
  status: string;
  original_amount: number;
  negotiated_amount: number;
  next_steps: string[];
}

// --- Profile doctors (api_profile.py) ---

export interface DoctorItem {
  id?: string;
  name: string;
  specialty: string;
  credential?: string;
  practice_name?: string;
  phone?: string;
  address?: string;
}

// --- Insurance cards (api_insurance.py) ---

export interface InsuranceCard {
  id?: string;
  card_type: string;
  structured_data: Record<string, string | null>;
  front_url?: string | null;
  back_url?: string | null;
}

// --- Appointments / Care Visits (api_appointments.py) ---

export interface AppointmentItem {
  booking_id: string;
  provider_name: string;
  provider_specialty?: string | null;
  confirmed_date?: string | null;
  confirmed_time?: string | null;
  reason_for_visit?: string | null;
  status?: string;
}

// --- Booking Status Polling (api_booking.py) ---

export interface BookingStatusResponse {
  booking_id: string;
  phase: string;
  message: string;
  question?: string | null;
  field_name?: string | null;
  result?: Record<string, unknown> | null;
  elapsed_seconds: number;
  attempt_count?: number;
  cancel_requested?: boolean;
  provider_name?: string | null;
  provider_specialty?: string | null;
  provider_phone?: string | null;
  reason_for_visit?: string | null;
  is_cancellation?: boolean;
  is_reschedule?: boolean;
  original_date?: string | null;
  original_time?: string | null;
  google_calendar_url?: string | null;
  apple_calendar_url?: string | null;
  booking_result?: BookingResultPayload | null;
  suggestions?: string[] | null;
}

export interface BookingResultPayload {
  booking_id: string;
  status: string;
  provider_name: string;
  provider_specialty?: string | null;
  provider_phone?: string | null;
  confirmed_date?: string | null;
  confirmed_time?: string | null;
  reason_for_visit?: string | null;
  transcript_summary?: string | null;
  notes?: string | null;
  is_cancellation?: boolean;
  is_reschedule?: boolean;
  original_date?: string | null;
  original_time?: string | null;
  additional_answers?: Record<string, string> | null;
  google_calendar_url?: string | null;
  apple_calendar_url?: string | null;
}

// --- Habits (api_habits.py) ---

export interface Habit {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  sort_order: number;
}

// --- Care Todos / Game Plan (api_todos.py) ---

export interface CareTodo {
  id: string;
  profile_id: string;
  title: string;
  subtitle: string;
  color: string;
  book_message: string;
  status: "pending" | "completed" | "dismissed";
  category: string;
  frequency: "once" | "daily" | "weekly" | "monthly";
  recurrence_interval: number;
  due_date?: string | null;
  due_time?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CareTodoCreate {
  title: string;
  subtitle?: string;
  color?: string;
  frequency?: string;
  recurrence_interval?: number;
  due_date?: string | null;
  due_time?: string | null;
  book_message?: string;
  category?: string;
}

// --- Inline Forms (request_user_info tool) ---

export interface FormField {
  key: string;
  label: string;
  type: "text" | "date" | "phone" | "address" | "select" | "textarea" | "image";
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface FormRequest {
  form_id: string;
  title: string;
  description?: string;
  fields: FormField[];
  save_to: "profile" | "insurance" | "none";
}

// --- Personal / Health profile (api_profile.py) ---

export interface PersonalInfo {
  first_name: string;
  last_name: string;
  preferred_name: string;
  email: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  home_address: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface SavedCondition {
  id: string;
  name: string;
  status: string;
  diagnosed_date: string;
  notes: string;
}

export interface SavedMedication {
  id: string;
  name: string;
  dosage_strength: string;
  frequency: string;
  indication: string;
}

export interface SavedSurgery {
  id: string;
  name: string;
  year: string;
  notes: string;
}

export interface SavedAllergy {
  id: string;
  name: string;
  type: string;
  reaction: string;
  severity: string;
}

export interface SavedFamilyHistory {
  id: string;
  condition: string;
  relationship: string;
  details: string;
}

export interface SavedSocialHistory {
  id: string;
  category: string;
  status: string;
  details: string;
}

export interface HealthData {
  conditions: SavedCondition[];
  medications: SavedMedication[];
  surgeries: SavedSurgery[];
  allergies: SavedAllergy[];
  familyHistory: SavedFamilyHistory[];
  socialHistory: SavedSocialHistory[];
}

export interface StructuredDocument {
  id: string;
  filename: string;
  doc_type: string;
  doc_title: string;
  download_url: string | null;
  created_at: string;
}

export interface CareVisit {
  id: string;
  visit_type: string;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  location?: string | null;
  visit_date: string;
  summary?: string;
  rating?: number | null;
  review?: string | null;
  labs?: { name: string; value: string; flag?: string }[];
  documents?: string[];
}
