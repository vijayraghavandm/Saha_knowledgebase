import type {
  AppState,
  CarePlanExample,
  EvidenceState,
  KnowledgeRecord,
  ReviewAction,
  RevisionLine,
  SourceReference,
  WorkflowCounts,
} from '../types';

/** The wording currently in force: the reviewer's edit if there is one, else the original. */
export function effectiveContent(record: KnowledgeRecord): string {
  return record.edited_content ?? record.original_content;
}

export function isAccepted(record: KnowledgeRecord): boolean {
  return (
    record.review.state === 'accepted_for_prototype' ||
    record.review.state === 'edited_and_accepted_for_prototype'
  );
}

export function recordsForDimension(state: AppState, dimensionId: string): KnowledgeRecord[] {
  return state.knowledge_records.filter((r) => r.dimension_id === dimensionId);
}

export function referencesForRecord(state: AppState, recordId: string): SourceReference[] {
  return state.medical_references.filter((ref) => ref.record_id === recordId);
}

/**
 * A reference counts as verified only when a person has recorded what they
 * checked. A title or a typed URL on its own is never enough.
 */
export function isReferenceVerified(ref: SourceReference): boolean {
  return [ref.source_title, ref.locator, ref.verification_note, ref.verifier_name, ref.verification_date].every(
    (v) => v.trim() !== '',
  );
}

/** Why an evidence state cannot be selected right now, or null when it can. */
export function evidenceBlockReason(state: AppState, recordId: string, target: EvidenceState): string | null {
  const refs = referencesForRecord(state, recordId);
  if (target === 'not_supplied') {
    return refs.length > 0 ? 'References are attached. Remove them to return to Not supplied.' : null;
  }
  if (refs.length === 0) return 'Add a source reference first.';
  if (target === 'supported' && !refs.some(isReferenceVerified)) {
    return 'Supported needs a reference with a locator, verification note, verifier name, and verification date.';
  }
  return null;
}

/** Why a review control is disabled right now, or null when it can be used. */
export function reviewBlockReason(record: KnowledgeRecord, action: ReviewAction, draft: string): string | null {
  const current = effectiveContent(record);
  const next = draft.trim();
  if (action === 'accept') {
    if (next !== current) return 'There are unsaved edits. Use Edit and accept, or save or discard the edit first.';
    if (current !== record.original_content) return 'Content differs from the original. Use Edit and accept.';
  }
  if (action === 'edit_and_accept') {
    if (next === '') return 'Content cannot be empty.';
    if (next === record.original_content) return 'Nothing has been edited. Use Accept for prototype.';
  }
  return null;
}

/** Workflow counts derived from local state. These are not quality or validation scores. */
export function workflowCounts(state: AppState): WorkflowCounts {
  const records = state.knowledge_records;
  return {
    dimensions_present: state.template.dimensions.length,
    records_total: records.length,
    records_reviewed: records.filter(
      (r) => r.review.state !== 'unreviewed' && r.review.state !== 'needs_re_review',
    ).length,
    records_needing_evidence: records.filter((r) => r.review.state === 'needs_evidence').length,
    records_missing_patient_information: records.filter((r) => r.review.state === 'needs_patient_information')
      .length,
    open_decisions: state.meeting_decisions.filter((d) => d.status === 'open').length,
  };
}

/**
 * The selected revision: the working draft with accepted suggestions applied.
 * Computed on demand, so the original and working drafts are never modified.
 */
export function selectedRevision(example: CarePlanExample): RevisionLine[] {
  let lines: Array<RevisionLine & { id: string | null }> = example.working_draft.map((l) => ({
    id: l.id,
    text: l.text,
    origin: 'draft_unchanged',
    suggestion_id: null,
  }));
  if (!example.reviewer_report.loaded) return lines.map(({ id: _id, ...rest }) => rest);

  for (const s of example.reviewer_report.suggestions) {
    if (s.decision !== 'accepted') continue;
    const effect = s.effect;
    if (effect.op === 'add') {
      lines.push({ id: null, text: effect.new_text, origin: 'added', suggestion_id: s.id });
      continue;
    }
    const index = lines.findIndex((l) => l.id === effect.target_line_id);
    if (effect.op === 'remove') {
      if (index >= 0) lines = lines.filter((_, i) => i !== index);
    } else if (effect.op === 'retain') {
      if (index >= 0) lines[index] = { ...lines[index], origin: 'retained', suggestion_id: s.id };
    } else if (index >= 0) {
      lines[index] = { ...lines[index], text: effect.new_text, origin: 'replaced', suggestion_id: s.id };
    } else {
      // The targeted draft line was removed from the working draft; keep the correction visible.
      lines.push({ id: null, text: effect.new_text, origin: 'added', suggestion_id: s.id });
    }
  }
  return lines.map(({ id: _id, ...rest }) => rest);
}

export function nextId(existing: string[], prefix: string): string {
  const max = existing.reduce((acc, id) => {
    const m = id.startsWith(prefix) ? Number(id.slice(prefix.length)) : NaN;
    return Number.isFinite(m) ? Math.max(acc, m) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}
