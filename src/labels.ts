import type {
  ClinicalField,
  ContentOrigin,
  ContentType,
  DecisionStatus,
  EvidenceState,
  FlagStatus,
  InclusionDecision,
  IntendedUse,
  Priority,
  ProfileField,
  ReviewAction,
  ReviewState,
  SeedSource,
  SourceType,
  SuggestionCategory,
  Urgency,
} from './types';

export const DEMO_BANNER = 'Meeting prototype · Synthetic/draft content · Not for patient care';

export const INCLUSION_LABELS: Record<InclusionDecision, string> = {
  to_discuss: 'To discuss',
  include_v1: 'Include in v1',
  conditional: 'Conditional',
  defer: 'Defer',
  not_applicable: 'Not applicable',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  question: 'Question',
  observation: 'Observation',
  do: 'Do',
  dont: "Don't",
  precaution: 'Precaution',
  protocol_gap: 'Protocol gap',
  tip: 'Tip',
};

export const INTENDED_USE_LABELS: Record<IntendedUse, string> = {
  onboarding: 'Onboarding',
  care_plan: 'Care plan',
  daily_guidance: 'Daily guidance',
  follow_up: 'Follow-up',
  coordinator_handover: 'Coordinator handover',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  unset: 'Unset',
  core: 'Core',
  conditional: 'Conditional',
  optional: 'Optional',
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  not_assessed: 'Not assessed',
  clinician_defined: 'Clinician-defined',
};

export const ORIGIN_LABELS: Record<ContentOrigin, string> = {
  synthetic_example: 'Synthetic example',
  clinician_entered: 'Clinician-entered',
  model_draft: 'Model draft',
  source_backed_draft: 'Source-backed draft',
};

export const SEED_SOURCE_LABELS: Record<SeedSource, string> = {
  supplied_in_brief: 'Supplied in the build brief',
  assistant_added_seed: 'Added while building the prototype (same information-capture scope)',
  added_in_prototype: 'Added in this prototype session',
};

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  not_supplied: 'Not supplied',
  unverified: 'Unverified',
  supported: 'Supported',
  conflicting: 'Conflicting',
};

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  unreviewed: 'Unreviewed',
  accepted_for_prototype: 'Accepted for prototype',
  edited_and_accepted_for_prototype: 'Edited and accepted for prototype',
  needs_evidence: 'Needs evidence',
  needs_patient_information: 'Needs patient information',
  deferred: 'Deferred',
  rejected: 'Rejected',
  needs_re_review: 'Needs re-review',
};

export const REVIEW_ACTION_LABELS: Record<ReviewAction, string> = {
  accept: 'Accept for prototype',
  edit_and_accept: 'Edit and accept for prototype',
  needs_evidence: 'Needs evidence',
  needs_patient_information: 'Needs patient information',
  defer: 'Defer',
  reject: 'Reject',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  guideline: 'Guideline',
  textbook: 'Textbook',
  journal_article: 'Journal article',
  institutional_protocol: 'Institutional protocol',
  clinician_note: 'Clinician note',
  other: 'Other',
};

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  retain: 'Retain',
  correct_or_remove: 'Correct or remove',
  add: 'Add',
  ask_missing_information: 'Ask for missing information',
  prioritise: 'Prioritise',
  refer_human_decision: 'Refer for human decision',
};

export const PROFILE_LABELS: Record<ProfileField, string> = {
  summary: 'Elder (synthetic)',
  condition_context: 'Condition context',
  caregiver_role: 'Caregiver role',
  caregiver_task_competence: 'Caregiver task-specific competence',
  preferences: 'Preferences',
  baseline_assistance: 'Baseline assistance',
  current_instructions: 'Current instructions',
  care_coordinator: 'Care coordinator',
  clinical_contact: 'Designated clinical contact',
};

export const CLINICAL_FIELD_LABELS: Record<ClinicalField, string> = {
  medication_details: 'Medication details',
  monitoring_limits: 'Monitoring limits',
  activity_targets: 'Activity targets',
  treatment_settings: 'Treatment settings',
};

export const FLAG_STATUS_LABELS: Record<FlagStatus, string> = {
  not_assessed: 'Not assessed',
  issue_present: 'Issue present',
  not_found: 'Not found in this review',
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
};

export const REVISION_ORIGIN_LABELS = {
  draft_unchanged: 'From draft',
  retained: 'Retained',
  replaced: 'Corrected',
  added: 'Added',
} as const;
