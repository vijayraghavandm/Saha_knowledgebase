// Typed data model for Saha Knowledge Review Studio (meeting prototype).
// Four objects are kept separate on purpose:
//   1. DiseaseTemplate    — which topics should be covered
//   2. KnowledgeRecord    — candidate questions, observations, instructions, precautions
//   3. CarePlanExample    — patient-specific context and draft for ONE synthetic elder
//   4. Scorecard          — how candidate content and suggested changes are evaluated

export const CLINICAL_USE_STATUS = 'not_released' as const;
export type ClinicalUseStatus = typeof CLINICAL_USE_STATUS;

// ---------- 1. Disease template ----------

export const INCLUSION_DECISIONS = ['to_discuss', 'include_v1', 'conditional', 'defer', 'not_applicable'] as const;
export type InclusionDecision = (typeof INCLUSION_DECISIONS)[number];

export interface Dimension {
  /** Stable ID. Never reused or renumbered, including after reordering. */
  id: string;
  title: string;
  purpose_question: string;
  example_question: string;
  inclusion_decision: InclusionDecision;
  /** Required when inclusion_decision is not_applicable. */
  not_applicable_reason: string;
  reviewer_comment: string;
}

export interface TemplateChange {
  version: number;
  timestamp: string;
  summary: string;
}

export interface DiseaseTemplate {
  schema_version: string;
  template_id: string;
  /** Incremented after substantive edits: wording, order, or added dimensions. */
  template_version: number;
  label: string;
  design_status: string;
  demo_only: true;
  condition_example: string;
  intended_audience: string;
  clinical_use_status: ClinicalUseStatus;
  design_basis: { source: string; passage: string; note: string };
  dimensions: Dimension[];
  change_log: TemplateChange[];
}

// ---------- 2. Knowledge records ----------

export const CONTENT_TYPES = ['question', 'observation', 'do', 'dont', 'precaution', 'protocol_gap', 'tip'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const INTENDED_USES = ['onboarding', 'care_plan', 'daily_guidance', 'follow_up', 'coordinator_handover'] as const;
export type IntendedUse = (typeof INTENDED_USES)[number];

export const PRIORITIES = ['unset', 'core', 'conditional', 'optional'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Urgency is never inferred from priority. */
export const URGENCIES = ['not_assessed', 'clinician_defined'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const CONTENT_ORIGINS = ['synthetic_example', 'clinician_entered', 'model_draft', 'source_backed_draft'] as const;
export type ContentOrigin = (typeof CONTENT_ORIGINS)[number];

export const EVIDENCE_STATES = ['not_supplied', 'unverified', 'supported', 'conflicting'] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const REVIEW_STATES = [
  'unreviewed',
  'accepted_for_prototype',
  'edited_and_accepted_for_prototype',
  'needs_evidence',
  'needs_patient_information',
  'deferred',
  'rejected',
  'needs_re_review',
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const REVIEW_ACTIONS = [
  'accept',
  'edit_and_accept',
  'needs_evidence',
  'needs_patient_information',
  'defer',
  'reject',
] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export const SEED_SOURCES = ['supplied_in_brief', 'assistant_added_seed', 'added_in_prototype'] as const;
export type SeedSource = (typeof SEED_SOURCES)[number];

export interface HistoryEntry {
  timestamp: string;
  /** Reviewer name as typed. Not an authenticated identity. */
  actor: string;
  action: string;
  detail: string;
}

export interface RecordReview {
  state: ReviewState;
  comment: string;
  /** Typed into this local prototype. Not an authenticated identity. */
  reviewer_name: string;
  timestamp: string | null;
}

export interface KnowledgeRecord {
  id: string;
  version: number;
  condition_id: string;
  dimension_id: string;
  title: string;
  content_type: ContentType;
  /** Content as first supplied. Never overwritten. */
  original_content: string;
  /** Reviewer's edited wording, or null when unchanged. */
  edited_content: string | null;
  intended_use: IntendedUse[];
  applicability: string;
  required_patient_information: string;
  caregiver_role: string;
  /** Free text; "Unknown" is a valid value. */
  required_training: string;
  proposed_priority: Priority;
  urgency: Urgency;
  /** Clinician-entered text, only meaningful when urgency is clinician_defined. */
  urgency_note: string;
  content_origin: ContentOrigin;
  seed_source: SeedSource;
  /** True when the content is a placeholder waiting for clinical source/input. */
  needs_clinical_input: boolean;
  question_for_clinician: string;
  evidence_reference_ids: string[];
  evidence_state: EvidenceState;
  review: RecordReview;
  history: HistoryEntry[];
  clinical_use_status: ClinicalUseStatus;
  demo_only: true;
}

export const SOURCE_TYPES = [
  'guideline',
  'textbook',
  'journal_article',
  'institutional_protocol',
  'clinician_note',
  'other',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface SourceReference {
  id: string;
  record_id: string;
  source_title: string;
  edition_or_date: string;
  /** Section/page or URL, as typed. */
  locator: string;
  supplied_excerpt: string;
  source_type: SourceType;
  verification_note: string;
  /** Typed into this local prototype. Not an authenticated identity. */
  verifier_name: string;
  verification_date: string;
  added_at: string;
  demo_only: true;
}

// ---------- 3. Patient-specific example ----------

export const PROFILE_FIELDS = [
  'summary',
  'condition_context',
  'caregiver_role',
  'caregiver_task_competence',
  'preferences',
  'baseline_assistance',
  'current_instructions',
  'care_coordinator',
  'clinical_contact',
] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** These stay null unless genuinely provided for review. Nothing is invented. */
export const CLINICAL_FIELDS = [
  'medication_details',
  'monitoring_limits',
  'activity_targets',
  'treatment_settings',
] as const;
export type ClinicalField = (typeof CLINICAL_FIELDS)[number];

export interface DraftLine {
  id: string;
  text: string;
}

export const SUGGESTION_CATEGORIES = [
  'retain',
  'correct_or_remove',
  'add',
  'ask_missing_information',
  'prioritise',
  'refer_human_decision',
] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export type SuggestionEffect =
  | { op: 'retain'; target_line_id: string }
  | { op: 'replace'; target_line_id: string; new_text: string }
  | { op: 'remove'; target_line_id: string }
  | { op: 'add'; new_text: string };

export const SUGGESTION_DECISIONS = ['pending', 'accepted', 'rejected'] as const;
export type SuggestionDecision = (typeof SUGGESTION_DECISIONS)[number];

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  text: string;
  rationale: string;
  record_ids: string[];
  dimension_ids: string[];
  effect: SuggestionEffect;
  decision: SuggestionDecision;
}

export interface ReviewerReport {
  source: 'saved_mock_fixture_no_model_call';
  loaded: boolean;
  loaded_at: string | null;
  suggestions: Suggestion[];
}

export interface RevisionLine {
  text: string;
  origin: 'draft_unchanged' | 'retained' | 'replaced' | 'added';
  suggestion_id: string | null;
}

// ---------- 4. Review scorecard ----------

export interface ScoreCriterion {
  id: string;
  label: string;
  /** Ordered rating labels for this criterion. */
  scale: string[];
  /** One of scale, or null when unrated. No average is ever calculated. */
  rating: string | null;
  note: string;
}

export const FLAG_STATUSES = ['not_assessed', 'issue_present', 'not_found'] as const;
export type FlagStatus = (typeof FLAG_STATUSES)[number];

export interface CriticalFlag {
  id: string;
  label: string;
  status: FlagStatus;
}

export interface Scorecard {
  criteria: ScoreCriterion[];
  critical_flags: CriticalFlag[];
  overall_note: string;
}

export interface CarePlanExample {
  synthetic: true;
  demo_only: true;
  label: string;
  profile: Record<ProfileField, string>;
  clinical_fields: Record<ClinicalField, string | null>;
  /** Preserved as supplied. Never edited. */
  original_draft: DraftLine[];
  /** Editable working copy of the baseline draft. */
  working_draft: DraftLine[];
  reviewer_report: ReviewerReport;
  scorecard: Scorecard;
}

// ---------- Prompts and meeting decisions ----------

export interface PromptTemplate {
  id: string;
  title: string;
  text: string;
  default_text: string;
}

export const DECISION_STATUSES = ['open', 'resolved'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export interface MeetingDecision {
  id: string;
  question: string;
  decision: string;
  owner: string;
  next_action: string;
  due_date: string;
  status: DecisionStatus;
}

// ---------- Whole app state ----------

export interface AppState {
  demo_only: true;
  clinical_use_status: ClinicalUseStatus;
  template: DiseaseTemplate;
  knowledge_records: KnowledgeRecord[];
  medical_references: SourceReference[];
  care_plan_example: CarePlanExample;
  prompt_templates: PromptTemplate[];
  meeting_decisions: MeetingDecision[];
  meeting_notes: string;
  /** Name typed by whoever is reviewing in this session. Not authenticated. */
  reviewer_name: string;
}

export interface WorkflowCounts {
  dimensions_present: number;
  records_total: number;
  records_reviewed: number;
  records_needing_evidence: number;
  records_missing_patient_information: number;
  open_decisions: number;
}
