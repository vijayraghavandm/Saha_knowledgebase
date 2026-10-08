// Pure state transitions. Every function returns a new state and leaves its
// input untouched. When a transition is not allowed it returns the same state;
// the matching "block reason" selector explains why so the UI can say so.

import { CONDITION_ID } from '../fixtures/copdRecords';
import {
  CLINICAL_USE_STATUS,
  type AppState,
  type CarePlanExample,
  type ClinicalField,
  type DiseaseTemplate,
  type EvidenceState,
  type FlagStatus,
  type InclusionDecision,
  type KnowledgeRecord,
  type MeetingDecision,
  type ProfileField,
  type ReviewAction,
  type ReviewState,
  type SourceReference,
  type SuggestionDecision,
} from '../types';
import {
  effectiveContent,
  evidenceBlockReason,
  isAccepted,
  isReferenceVerified,
  nextId,
  referencesForRecord,
  reviewBlockReason,
} from './selectors';

// ---------- Template ----------

function bumpTemplate(template: DiseaseTemplate, summary: string, now: string): DiseaseTemplate {
  const version = template.template_version + 1;
  return {
    ...template,
    template_version: version,
    change_log: [...template.change_log, { version, timestamp: now, summary }],
  };
}

export type DimensionTextField = 'title' | 'purpose_question' | 'example_question';

/** Substantive wording edit: increments the template version. */
export function editDimensionText(
  state: AppState,
  id: string,
  field: DimensionTextField,
  value: string,
  now: string,
): AppState {
  const next = value.trim();
  const dim = state.template.dimensions.find((d) => d.id === id);
  if (!dim || dim[field] === next) return state;
  if (field === 'title' && next === '') return state;
  const template = {
    ...state.template,
    dimensions: state.template.dimensions.map((d) => (d.id === id ? { ...d, [field]: next } : d)),
  };
  return { ...state, template: bumpTemplate(template, `${id}: ${field.replace('_', ' ')} edited`, now) };
}

/** Review annotation: does not change the template version. */
export function setDimensionComment(state: AppState, id: string, comment: string): AppState {
  return {
    ...state,
    template: {
      ...state.template,
      dimensions: state.template.dimensions.map((d) => (d.id === id ? { ...d, reviewer_comment: comment } : d)),
    },
  };
}

/** Review annotation. Not applicable is refused without a reason. */
export function setInclusion(state: AppState, id: string, decision: InclusionDecision, reason = ''): AppState {
  const trimmed = reason.trim();
  if (decision === 'not_applicable' && trimmed === '') return state;
  return {
    ...state,
    template: {
      ...state.template,
      dimensions: state.template.dimensions.map((d) =>
        d.id === id
          ? {
              ...d,
              inclusion_decision: decision,
              not_applicable_reason: decision === 'not_applicable' ? trimmed : '',
            }
          : d,
      ),
    },
  };
}

/** Reordering keeps every ID stable and increments the template version. */
export function moveDimension(state: AppState, id: string, direction: -1 | 1, now: string): AppState {
  const dims = [...state.template.dimensions];
  const from = dims.findIndex((d) => d.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= dims.length) return state;
  [dims[from], dims[to]] = [dims[to], dims[from]];
  return {
    ...state,
    template: bumpTemplate({ ...state.template, dimensions: dims }, `${id}: moved to position ${to + 1}`, now),
  };
}

export function addDimension(
  state: AppState,
  input: { title: string; purpose_question: string; example_question: string },
  now: string,
): AppState {
  const title = input.title.trim();
  if (title === '') return state;
  const id = nextId(
    state.template.dimensions.map((d) => d.id),
    'D',
  );
  const template = {
    ...state.template,
    dimensions: [
      ...state.template.dimensions,
      {
        id,
        title,
        purpose_question: input.purpose_question.trim(),
        example_question: input.example_question.trim(),
        inclusion_decision: 'to_discuss' as const,
        not_applicable_reason: '',
        reviewer_comment: '',
      },
    ],
  };
  return { ...state, template: bumpTemplate(template, `${id}: dimension added`, now) };
}

// ---------- Knowledge records ----------

function mapRecord(state: AppState, id: string, fn: (r: KnowledgeRecord) => KnowledgeRecord): AppState {
  return { ...state, knowledge_records: state.knowledge_records.map((r) => (r.id === id ? fn(r) : r)) };
}

function withHistory(record: KnowledgeRecord, now: string, actor: string, action: string, detail: string) {
  return { ...record, history: [...record.history, { timestamp: now, actor, action, detail }] };
}

export function addRecord(state: AppState, dimensionId: string, now: string): AppState {
  const id = nextId(
    state.knowledge_records.map((r) => r.id),
    'COPD-R',
  );
  const record: KnowledgeRecord = {
    id,
    version: 1,
    condition_id: CONDITION_ID,
    dimension_id: dimensionId,
    title: 'New candidate record',
    content_type: 'question',
    original_content: 'Draft content — replace with one atomic question, observation, precaution, or candidate action.',
    edited_content: null,
    intended_use: [],
    applicability: '',
    required_patient_information: '',
    caregiver_role: 'Unknown',
    required_training: 'Unknown',
    proposed_priority: 'unset',
    urgency: 'not_assessed',
    urgency_note: '',
    content_origin: 'clinician_entered',
    seed_source: 'added_in_prototype',
    needs_clinical_input: false,
    question_for_clinician: '',
    evidence_reference_ids: [],
    evidence_state: 'not_supplied',
    review: { state: 'unreviewed', comment: '', reviewer_name: '', timestamp: null },
    history: [{ timestamp: now, actor: state.reviewer_name, action: 'Record added', detail: 'Added in this prototype session.' }],
    clinical_use_status: CLINICAL_USE_STATUS,
    demo_only: true,
  };
  return { ...state, knowledge_records: [...state.knowledge_records, record] };
}

export type RecordMetaPatch = Partial<
  Pick<
    KnowledgeRecord,
    | 'dimension_id'
    | 'content_type'
    | 'intended_use'
    | 'applicability'
    | 'required_patient_information'
    | 'caregiver_role'
    | 'required_training'
    | 'proposed_priority'
    | 'urgency'
    | 'urgency_note'
    | 'content_origin'
    | 'needs_clinical_input'
    | 'question_for_clinician'
  >
>;

/**
 * Classification and context fields. Changing them never touches the review
 * state or the evidence state; in particular, priority does not set urgency.
 */
export function updateRecordMeta(state: AppState, id: string, patch: RecordMetaPatch, now: string): AppState {
  return mapRecord(state, id, (r) => {
    const changed = (Object.keys(patch) as Array<keyof RecordMetaPatch>).filter(
      (k) => JSON.stringify(patch[k]) !== JSON.stringify(r[k]),
    );
    if (changed.length === 0) return r;
    const next = { ...r, ...patch };
    if (next.urgency === 'not_assessed') next.urgency_note = '';
    return withHistory(next, now, state.reviewer_name, 'Fields updated', changed.join(', '));
  });
}

/**
 * Wording edit. The original content is kept; the edit is stored separately.
 * Editing accepted content returns the record to Needs re-review.
 */
export function editRecordContent(
  state: AppState,
  id: string,
  patch: { title?: string; content?: string },
  now: string,
): AppState {
  return mapRecord(state, id, (r) => {
    const title = patch.title !== undefined ? patch.title.trim() : r.title;
    const before = effectiveContent(r);
    const content = patch.content !== undefined ? patch.content.trim() : before;
    if (title === '' || content === '') return r;
    if (title === r.title && content === before) return r;

    const details: string[] = [];
    if (title !== r.title) details.push(`Title: "${r.title}" → "${title}"`);
    if (content !== before) details.push(`Content: "${before}" → "${content}"`);

    let next: KnowledgeRecord = {
      ...r,
      title,
      edited_content: content === r.original_content ? null : content,
      version: r.version + 1,
    };
    if (isAccepted(r)) {
      next = { ...next, review: { ...r.review, state: 'needs_re_review' } };
      details.push('Previously accepted content was edited: returned to Needs re-review.');
    }
    return withHistory(next, now, state.reviewer_name, 'Content edited', details.join(' | '));
  });
}

export function setReviewComment(state: AppState, id: string, comment: string): AppState {
  return mapRecord(state, id, (r) => ({ ...r, review: { ...r.review, comment } }));
}

const ACTION_TO_STATE: Record<ReviewAction, ReviewState> = {
  accept: 'accepted_for_prototype',
  edit_and_accept: 'edited_and_accepted_for_prototype',
  needs_evidence: 'needs_evidence',
  needs_patient_information: 'needs_patient_information',
  defer: 'deferred',
  reject: 'rejected',
};

/**
 * Records a review decision. This changes the review state only. It does not
 * verify evidence, grant permission to perform a task, or approve patient use.
 * `draft` is the wording in the editor; only Edit and accept saves it.
 */
export function reviewRecord(state: AppState, id: string, action: ReviewAction, now: string, draft?: string): AppState {
  const record = state.knowledge_records.find((r) => r.id === id);
  if (!record) return state;
  const wording = draft ?? effectiveContent(record);
  if (reviewBlockReason(record, action, wording) !== null) return state;

  const base = action === 'edit_and_accept' ? editRecordContent(state, id, { content: wording }, now) : state;
  return mapRecord(base, id, (r) =>
    withHistory(
      {
        ...r,
        review: { ...r.review, state: ACTION_TO_STATE[action], reviewer_name: state.reviewer_name, timestamp: now },
        clinical_use_status: CLINICAL_USE_STATUS,
      },
      now,
      state.reviewer_name,
      'Review decision',
      `${ACTION_TO_STATE[action]}${r.review.comment ? ` — ${r.review.comment}` : ''}`,
    ),
  );
}

// ---------- Source references and evidence ----------

export type ReferenceInput = Pick<
  SourceReference,
  | 'source_title'
  | 'edition_or_date'
  | 'locator'
  | 'supplied_excerpt'
  | 'source_type'
  | 'verification_note'
  | 'verifier_name'
  | 'verification_date'
>;

/** Keeps the evidence state consistent with the references actually attached. */
function reconcileEvidence(state: AppState, recordId: string, now: string): AppState {
  const refs = referencesForRecord(state, recordId);
  return mapRecord(state, recordId, (r) => {
    let evidence: EvidenceState = r.evidence_state;
    if (refs.length === 0) evidence = 'not_supplied';
    else if (evidence === 'not_supplied') evidence = 'unverified';
    else if (evidence === 'supported' && !refs.some(isReferenceVerified)) evidence = 'unverified';
    const next = { ...r, evidence_reference_ids: refs.map((ref) => ref.id), evidence_state: evidence };
    return evidence === r.evidence_state
      ? next
      : withHistory(next, now, state.reviewer_name, 'Evidence state', `${r.evidence_state} → ${evidence}`);
  });
}

/** Adding a reference moves evidence to Unverified at most. It never sets Supported. */
export function addReference(state: AppState, recordId: string, input: ReferenceInput, now: string): AppState {
  if (input.source_title.trim() === '' || !state.knowledge_records.some((r) => r.id === recordId)) return state;
  const ref: SourceReference = {
    ...input,
    source_title: input.source_title.trim(),
    id: nextId(
      state.medical_references.map((r) => r.id),
      'REF-',
    ),
    record_id: recordId,
    added_at: now,
    demo_only: true,
  };
  const withRef = { ...state, medical_references: [...state.medical_references, ref] };
  const logged = mapRecord(withRef, recordId, (r) =>
    withHistory(r, now, state.reviewer_name, 'Reference added', `${ref.id}: ${ref.source_title}`),
  );
  return reconcileEvidence(logged, recordId, now);
}

export function updateReference(state: AppState, refId: string, patch: Partial<ReferenceInput>, now: string): AppState {
  const ref = state.medical_references.find((r) => r.id === refId);
  if (!ref) return state;
  if (patch.source_title !== undefined && patch.source_title.trim() === '') return state;
  const next = {
    ...state,
    medical_references: state.medical_references.map((r) => (r.id === refId ? { ...r, ...patch } : r)),
  };
  return reconcileEvidence(next, ref.record_id, now);
}

export function removeReference(state: AppState, refId: string, now: string): AppState {
  const ref = state.medical_references.find((r) => r.id === refId);
  if (!ref) return state;
  const without = { ...state, medical_references: state.medical_references.filter((r) => r.id !== refId) };
  const logged = mapRecord(without, ref.record_id, (r) =>
    withHistory(r, now, state.reviewer_name, 'Reference removed', `${ref.id}: ${ref.source_title}`),
  );
  return reconcileEvidence(logged, ref.record_id, now);
}

/** Evidence state is set by a person, and only when the attached references allow it. */
export function setEvidenceState(state: AppState, recordId: string, target: EvidenceState, now: string): AppState {
  if (evidenceBlockReason(state, recordId, target) !== null) return state;
  return mapRecord(state, recordId, (r) =>
    r.evidence_state === target
      ? r
      : withHistory(
          { ...r, evidence_state: target },
          now,
          state.reviewer_name,
          'Evidence state',
          `${r.evidence_state} → ${target}`,
        ),
  );
}

// ---------- Care-plan review example ----------

function mapExample(state: AppState, fn: (e: CarePlanExample) => CarePlanExample): AppState {
  return { ...state, care_plan_example: fn(state.care_plan_example) };
}

export function setProfileField(state: AppState, field: ProfileField, value: string): AppState {
  return mapExample(state, (e) => ({ ...e, profile: { ...e.profile, [field]: value } }));
}

/** Blank input is stored as null so the gap stays a gap. */
export function setClinicalField(state: AppState, field: ClinicalField, value: string): AppState {
  const trimmed = value.trim();
  return mapExample(state, (e) => ({
    ...e,
    clinical_fields: { ...e.clinical_fields, [field]: trimmed === '' ? null : trimmed },
  }));
}

/** Edits the working copy only. The original draft is never changed. */
export function editDraftLine(state: AppState, lineId: string, text: string): AppState {
  return mapExample(state, (e) => ({
    ...e,
    working_draft: e.working_draft.map((l) => (l.id === lineId ? { ...l, text } : l)),
  }));
}

export function addDraftLine(state: AppState, text: string): AppState {
  if (text.trim() === '') return state;
  return mapExample(state, (e) => ({
    ...e,
    working_draft: [
      ...e.working_draft,
      {
        id: nextId(
          [...e.original_draft, ...e.working_draft].map((l) => l.id),
          'L',
        ),
        text: text.trim(),
      },
    ],
  }));
}

export function removeDraftLine(state: AppState, lineId: string): AppState {
  return mapExample(state, (e) => ({ ...e, working_draft: e.working_draft.filter((l) => l.id !== lineId) }));
}

export function restoreWorkingDraft(state: AppState): AppState {
  return mapExample(state, (e) => ({ ...e, working_draft: e.original_draft.map((l) => ({ ...l })) }));
}

/** Shows or hides the saved mock report. No model is called. */
export function setReviewerReportLoaded(state: AppState, loaded: boolean, now: string): AppState {
  return mapExample(state, (e) => ({
    ...e,
    reviewer_report: { ...e.reviewer_report, loaded, loaded_at: loaded ? now : null },
  }));
}

export function decideSuggestion(state: AppState, suggestionId: string, decision: SuggestionDecision): AppState {
  return mapExample(state, (e) => ({
    ...e,
    reviewer_report: {
      ...e.reviewer_report,
      suggestions: e.reviewer_report.suggestions.map((s) => (s.id === suggestionId ? { ...s, decision } : s)),
    },
  }));
}

export function setScoreRating(state: AppState, criterionId: string, rating: string | null): AppState {
  return mapExample(state, (e) => ({
    ...e,
    scorecard: {
      ...e.scorecard,
      criteria: e.scorecard.criteria.map((c) =>
        c.id === criterionId && (rating === null || c.scale.includes(rating)) ? { ...c, rating } : c,
      ),
    },
  }));
}

export function setScoreNote(state: AppState, criterionId: string, note: string): AppState {
  return mapExample(state, (e) => ({
    ...e,
    scorecard: {
      ...e.scorecard,
      criteria: e.scorecard.criteria.map((c) => (c.id === criterionId ? { ...c, note } : c)),
    },
  }));
}

export function setCriticalFlag(state: AppState, flagId: string, status: FlagStatus): AppState {
  return mapExample(state, (e) => ({
    ...e,
    scorecard: {
      ...e.scorecard,
      critical_flags: e.scorecard.critical_flags.map((f) => (f.id === flagId ? { ...f, status } : f)),
    },
  }));
}

export function setScorecardNote(state: AppState, note: string): AppState {
  return mapExample(state, (e) => ({ ...e, scorecard: { ...e.scorecard, overall_note: note } }));
}

// ---------- Prompts, decisions, notes ----------

export function setPromptText(state: AppState, id: string, text: string): AppState {
  return { ...state, prompt_templates: state.prompt_templates.map((p) => (p.id === id ? { ...p, text } : p)) };
}

export function resetPromptText(state: AppState, id: string): AppState {
  return {
    ...state,
    prompt_templates: state.prompt_templates.map((p) => (p.id === id ? { ...p, text: p.default_text } : p)),
  };
}

export function updateDecision(
  state: AppState,
  id: string,
  patch: Partial<Omit<MeetingDecision, 'id'>>,
): AppState {
  return {
    ...state,
    meeting_decisions: state.meeting_decisions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  };
}

export function addDecision(state: AppState, question: string): AppState {
  if (question.trim() === '') return state;
  return {
    ...state,
    meeting_decisions: [
      ...state.meeting_decisions,
      {
        id: nextId(
          state.meeting_decisions.map((d) => d.id),
          'M',
        ),
        question: question.trim(),
        decision: '',
        owner: '',
        next_action: '',
        due_date: '',
        status: 'open',
      },
    ],
  };
}

export function setMeetingNotes(state: AppState, notes: string): AppState {
  return { ...state, meeting_notes: notes };
}

export function setReviewerName(state: AppState, name: string): AppState {
  return { ...state, reviewer_name: name };
}
