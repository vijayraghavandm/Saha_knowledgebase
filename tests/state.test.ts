import { describe, expect, it } from 'vitest';
import {
  addDimension,
  addReference,
  decideSuggestion,
  editDimensionText,
  editDraftLine,
  editRecordContent,
  moveDimension,
  removeReference,
  reviewRecord,
  setClinicalField,
  setDimensionComment,
  setEvidenceState,
  setInclusion,
  setReviewerName,
  setReviewerReportLoaded,
  updateDecision,
  updateRecordMeta,
  type ReferenceInput,
} from '../src/state/actions';
import { BUNDLE_FORMAT, buildBundle, exportJson, exportMarkdown, parseBundle } from '../src/state/exporters';
import { createSeedState } from '../src/state/seed';
import { effectiveContent, selectedRevision, workflowCounts } from '../src/state/selectors';
import { STORAGE_BACKUP_KEY, STORAGE_KEY, loadState, saveState, type StorageLike } from '../src/state/storage';
import type { AppState, KnowledgeRecord } from '../src/types';

const NOW = '2026-10-08T10:00:00.000Z';
const LATER = '2026-10-08T10:05:00.000Z';
const R1 = 'COPD-R01';

const rec = (s: AppState, id = R1): KnowledgeRecord => s.knowledge_records.find((r) => r.id === id)!;

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const URL_ONLY: ReferenceInput = {
  source_title: 'Example source',
  edition_or_date: '',
  locator: 'https://example.invalid/page',
  supplied_excerpt: '',
  source_type: 'other',
  verification_note: '',
  verifier_name: '',
  verification_date: '',
};

describe('seed fixtures', () => {
  const seed = createSeedState();

  it('opens with the 20 proposed dimensions, all To discuss', () => {
    expect(seed.template.dimensions).toHaveLength(20);
    expect(seed.template.dimensions.map((d) => d.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`),
    );
    expect(seed.template.dimensions.every((d) => d.inclusion_decision === 'to_discuss')).toBe(true);
    expect(seed.template.dimensions.every((d) => d.example_question !== '')).toBe(true);
  });

  it('starts every record unreviewed, with no evidence and no reviewer name', () => {
    expect(seed.knowledge_records.length).toBeGreaterThanOrEqual(15);
    expect(seed.knowledge_records.length).toBeLessThanOrEqual(20);
    for (const r of seed.knowledge_records) {
      expect(r.review).toEqual({ state: 'unreviewed', comment: '', reviewer_name: '', timestamp: null });
      expect(r.evidence_state).toBe('not_supplied');
      expect(r.evidence_reference_ids).toEqual([]);
      expect(r.urgency).toBe('not_assessed');
      expect(r.clinical_use_status).toBe('not_released');
      expect(r.demo_only).toBe(true);
    }
    expect(seed.medical_references).toEqual([]);
    expect(JSON.stringify(seed)).not.toMatch(/"reviewer_name":"[^"]/);
  });

  it('contains no numeric values in candidate content, draft lines, or mock suggestions', () => {
    const texts = [
      ...seed.knowledge_records.flatMap((r) => [r.title, r.original_content, r.question_for_clinician]),
      ...seed.care_plan_example.original_draft.map((l) => l.text),
      ...seed.care_plan_example.reviewer_report.suggestions.flatMap((s) => [
        s.text,
        s.rationale,
        'new_text' in s.effect ? s.effect.new_text : '',
      ]),
      ...Object.values(seed.care_plan_example.profile),
    ];
    for (const t of texts) expect(t).not.toMatch(/\d/);
  });

  it('leaves patient-specific clinical fields null and the scorecard unrated', () => {
    expect(Object.values(seed.care_plan_example.clinical_fields)).toEqual([null, null, null, null]);
    expect(seed.care_plan_example.scorecard.criteria.every((c) => c.rating === null)).toBe(true);
    expect(seed.care_plan_example.scorecard.critical_flags.every((f) => f.status === 'not_assessed')).toBe(true);
  });

  it('links every mock suggestion to existing records and dimensions', () => {
    const recordIds = new Set(seed.knowledge_records.map((r) => r.id));
    const dimIds = new Set(seed.template.dimensions.map((d) => d.id));
    for (const s of seed.care_plan_example.reviewer_report.suggestions) {
      expect(s.record_ids.length + s.dimension_ids.length).toBeGreaterThan(0);
      expect(s.record_ids.every((id) => recordIds.has(id))).toBe(true);
      expect(s.dimension_ids.every((id) => dimIds.has(id))).toBe(true);
    }
  });

  it('leaves meeting owners and dates unassigned', () => {
    expect(seed.meeting_decisions).toHaveLength(8);
    expect(seed.meeting_decisions.every((d) => d.owner === '' && d.due_date === '' && d.status === 'open')).toBe(true);
  });
});

describe('disease template', () => {
  it('increments the version on wording edits and keeps IDs stable', () => {
    const s = editDimensionText(createSeedState(), 'D01', 'title', 'Scope', NOW);
    expect(s.template.template_version).toBe(2);
    expect(s.template.dimensions[0]).toMatchObject({ id: 'D01', title: 'Scope' });
    expect(s.template.change_log).toHaveLength(1);
    expect(editDimensionText(s, 'D01', 'title', 'Scope', NOW)).toBe(s);
    expect(editDimensionText(s, 'D01', 'title', '   ', NOW)).toBe(s);
  });

  it('does not increment the version for comments or inclusion decisions', () => {
    let s = setDimensionComment(createSeedState(), 'D02', 'Discuss with family');
    s = setInclusion(s, 'D02', 'include_v1');
    expect(s.template.template_version).toBe(1);
    expect(s.template.dimensions[1]).toMatchObject({ inclusion_decision: 'include_v1', reviewer_comment: 'Discuss with family' });
  });

  it('requires a reason for Not applicable', () => {
    const seed = createSeedState();
    expect(setInclusion(seed, 'D03', 'not_applicable', '  ')).toBe(seed);
    const s = setInclusion(seed, 'D03', 'not_applicable', 'Covered elsewhere');
    expect(s.template.dimensions[2]).toMatchObject({ inclusion_decision: 'not_applicable', not_applicable_reason: 'Covered elsewhere' });
    expect(setInclusion(s, 'D03', 'defer').template.dimensions[2].not_applicable_reason).toBe('');
  });

  it('reorders without renumbering and adds with the next unused ID', () => {
    let s = moveDimension(createSeedState(), 'D02', -1, NOW);
    expect(s.template.dimensions.slice(0, 2).map((d) => d.id)).toEqual(['D02', 'D01']);
    expect(moveDimension(s, 'D02', -1, NOW)).toBe(s);
    s = addDimension(s, { title: 'Caregiver wellbeing', purpose_question: 'P?', example_question: 'E?' }, NOW);
    expect(s.template.dimensions).toHaveLength(21);
    expect(s.template.dimensions[20].id).toBe('D21');
    expect(s.template.template_version).toBe(3);
  });
});

describe('knowledge record review', () => {
  it('accepting changes only the review state', () => {
    const seed = setReviewerName(createSeedState(), 'Typed Name');
    const s = reviewRecord(seed, R1, 'accept', NOW);
    const before = rec(seed);
    const after = rec(s);
    expect(after.review).toMatchObject({ state: 'accepted_for_prototype', reviewer_name: 'Typed Name', timestamp: NOW });
    expect(after.evidence_state).toBe('not_supplied');
    expect(after.clinical_use_status).toBe('not_released');
    expect(after.demo_only).toBe(true);
    expect(after.urgency).toBe('not_assessed');
    expect(after.proposed_priority).toBe(before.proposed_priority);
    expect(after.required_training).toBe('Unknown');
    expect(after.original_content).toBe(before.original_content);
    expect(s.knowledge_records.filter((r) => r.id !== R1)).toEqual(seed.knowledge_records.filter((r) => r.id !== R1));
  });

  it('editing accepted content returns it to Needs re-review and keeps history', () => {
    let s = reviewRecord(createSeedState(), R1, 'accept', NOW);
    const original = rec(s).original_content;
    s = editRecordContent(s, R1, { content: 'Reworded question?' }, LATER);
    const r = rec(s);
    expect(r.review.state).toBe('needs_re_review');
    expect(r.original_content).toBe(original);
    expect(r.edited_content).toBe('Reworded question?');
    expect(r.version).toBe(2);
    expect(r.history.map((h) => h.action)).toEqual(['Review decision', 'Content edited']);
    expect(r.history[1].detail).toContain(original);
  });

  it('separates Accept from Edit and accept', () => {
    const seed = createSeedState();
    expect(reviewRecord(seed, R1, 'edit_and_accept', NOW)).toBe(seed);
    expect(reviewRecord(seed, R1, 'accept', NOW, 'Unsaved different wording')).toBe(seed);

    const edited = reviewRecord(seed, R1, 'edit_and_accept', NOW, 'Edited wording?');
    expect(rec(edited).review.state).toBe('edited_and_accepted_for_prototype');
    expect(effectiveContent(rec(edited))).toBe('Edited wording?');
    expect(rec(edited).original_content).toBe(rec(seed).original_content);
    expect(reviewRecord(edited, R1, 'accept', LATER)).toBe(edited);
  });

  it('priority does not set urgency or review state', () => {
    const s = updateRecordMeta(createSeedState(), R1, { proposed_priority: 'core' }, NOW);
    expect(rec(s)).toMatchObject({ proposed_priority: 'core', urgency: 'not_assessed' });
    expect(rec(s).review.state).toBe('unreviewed');
  });

  it('counts workflow state from the records', () => {
    let s = reviewRecord(createSeedState(), R1, 'needs_evidence', NOW);
    s = reviewRecord(s, 'COPD-R02', 'needs_patient_information', NOW);
    s = reviewRecord(s, 'COPD-R03', 'accept', NOW);
    s = updateDecision(s, 'M01', { status: 'resolved' });
    expect(workflowCounts(s)).toEqual({
      dimensions_present: 20,
      records_total: s.knowledge_records.length,
      records_reviewed: 3,
      records_needing_evidence: 1,
      records_missing_patient_information: 1,
      open_decisions: 7,
    });
  });
});

describe('evidence', () => {
  it('a typed URL moves evidence to Unverified, never Supported', () => {
    const s = addReference(createSeedState(), R1, URL_ONLY, NOW);
    expect(rec(s).evidence_state).toBe('unverified');
    expect(rec(s).evidence_reference_ids).toEqual(['REF-01']);
    expect(rec(s).review.state).toBe('unreviewed');
    expect(setEvidenceState(s, R1, 'supported', NOW)).toBe(s);
  });

  it('allows Supported only once verification is recorded, and reverts when the reference goes', () => {
    const verified = { ...URL_ONLY, verification_note: 'Excerpt checked against source', verifier_name: 'Typed Verifier', verification_date: '2026-10-08' };
    let s = addReference(createSeedState(), R1, verified, NOW);
    expect(rec(s).evidence_state).toBe('unverified');
    s = setEvidenceState(s, R1, 'supported', NOW);
    expect(rec(s).evidence_state).toBe('supported');
    s = removeReference(s, 'REF-01', LATER);
    expect(rec(s).evidence_state).toBe('not_supplied');
    expect(s.medical_references).toEqual([]);
  });

  it('refuses evidence states that need a reference when none exists', () => {
    const seed = createSeedState();
    expect(setEvidenceState(seed, R1, 'conflicting', NOW)).toBe(seed);
    expect(setEvidenceState(seed, R1, 'supported', NOW)).toBe(seed);
  });
});

describe('care-plan review example', () => {
  it('keeps the original draft after changes are accepted', () => {
    const seed = createSeedState();
    const originalDraft = JSON.parse(JSON.stringify(seed.care_plan_example.original_draft));
    let s = setReviewerReportLoaded(seed, true, NOW);
    s = decideSuggestion(s, 'S02', 'accepted');
    s = decideSuggestion(s, 'S04', 'accepted');
    s = decideSuggestion(s, 'S03', 'rejected');
    s = editDraftLine(s, 'L6', 'Edited working line.');

    expect(s.care_plan_example.original_draft).toEqual(originalDraft);
    const revision = selectedRevision(s.care_plan_example);
    expect(revision).toHaveLength(originalDraft.length + 1);
    expect(revision[0]).toMatchObject({ origin: 'replaced', suggestion_id: 'S02' });
    expect(revision[1]).toMatchObject({ origin: 'draft_unchanged', text: originalDraft[1].text });
    expect(revision.at(-1)).toMatchObject({ origin: 'added', suggestion_id: 'S04' });
  });

  it('applies nothing until the example report is loaded', () => {
    const s = decideSuggestion(createSeedState(), 'S02', 'accepted');
    expect(selectedRevision(s.care_plan_example).every((l) => l.origin === 'draft_unchanged')).toBe(true);
  });

  it('stores a blank clinical field as null', () => {
    let s = setClinicalField(createSeedState(), 'monitoring_limits', 'As supplied by reviewer');
    expect(s.care_plan_example.clinical_fields.monitoring_limits).toBe('As supplied by reviewer');
    s = setClinicalField(s, 'monitoring_limits', '   ');
    expect(s.care_plan_example.clinical_fields.monitoring_limits).toBeNull();
  });
});

describe('export and import', () => {
  function workedState(): AppState {
    let s = setReviewerName(createSeedState(), 'Typed Name');
    s = editDimensionText(s, 'D01', 'title', 'Scope and limits', NOW);
    s = setInclusion(s, 'D03', 'not_applicable', 'Covered by D04');
    s = reviewRecord(s, R1, 'edit_and_accept', NOW, 'Edited wording?');
    s = addReference(s, 'COPD-R02', URL_ONLY, NOW);
    s = setReviewerReportLoaded(s, true, NOW);
    s = decideSuggestion(s, 'S07', 'accepted');
    return updateDecision(s, 'M02', { decision: 'Add caregiver wellbeing', owner: 'Typed Owner' });
  }

  it('round-trips a valid bundle', () => {
    const s = workedState();
    const result = parseBundle(exportJson(s, NOW));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state).toEqual(s);
  });

  it('keeps demo labels and derived views in the JSON bundle', () => {
    const bundle = buildBundle(workedState(), NOW);
    expect(bundle).toMatchObject({ bundle_format: BUNDLE_FORMAT, demo_only: true, clinical_use_status: 'not_released' });
    expect(bundle.label).toContain('Not for patient care');
    expect(bundle.template.dimensions[6].knowledge_record_ids).toEqual([R1]);
    expect(bundle.review_decisions.find((d) => d.record_id === R1)?.review_state).toBe('edited_and_accepted_for_prototype');
    expect(bundle.care_plan_example.original_draft).toHaveLength(6);
    expect(bundle.revised_demo_plan.some((l) => l.suggestion_id === 'S07')).toBe(true);
    expect(bundle.care_plan_example.clinical_fields.medication_details).toBeNull();
    expect(bundle.knowledge_records.every((r) => r.demo_only && r.clinical_use_status === 'not_released')).toBe(true);
  });

  it('reflects current state and the demo label in Markdown', () => {
    const md = exportMarkdown(workedState(), NOW);
    expect(md).toContain('DRAFT / DEMO ONLY');
    expect(md).toContain('Not for patient care');
    expect(md).toContain('Scope and limits');
    expect(md).toContain('Edited wording?');
    expect(md).toContain('Covered by D04');
    expect(md).toContain('NOT SUPPLIED (gap)');
    expect(md).toContain('Typed Owner');
    expect(md).not.toMatch(/average score|overall score:/i);
  });

  it('rejects malformed imports with actionable errors', () => {
    const cases: Array<[string, RegExp]> = [
      ['not json {', /not valid JSON/],
      ['[]', /one JSON object/],
      ['{"hello":"world"}', /bundle_format/],
      [JSON.stringify({ ...buildBundle(createSeedState(), NOW), bundle_version: 99 }), /version 99/],
      [JSON.stringify({ ...buildBundle(createSeedState(), NOW), demo_only: false }), /demo_only/],
      [JSON.stringify({ ...buildBundle(createSeedState(), NOW), knowledge_records: 'oops' }), /knowledge_records: expected a list/],
    ];
    for (const [text, pattern] of cases) {
      const result = parseBundle(text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toMatch(pattern);
    }
  });

  it('rejects records that point at a missing dimension or drop the not-released status', () => {
    const bundle = JSON.parse(exportJson(createSeedState(), NOW));
    bundle.knowledge_records[0].dimension_id = 'D99';
    bundle.knowledge_records[1].clinical_use_status = 'released';
    const result = parseBundle(JSON.stringify(bundle));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toMatch(/D99.*not a dimension/);
      expect(result.errors.join('\n')).toMatch(/clinical_use_status: must be "not_released"/);
    }
  });
});

describe('local persistence', () => {
  it('saves and reloads the same state', () => {
    const storage = memoryStorage();
    const s = reviewRecord(setDimensionComment(createSeedState(), 'D05', 'Check'), R1, 'defer', NOW);
    expect(saveState(storage, s, NOW).ok).toBe(true);
    const loaded = loadState(storage);
    expect(loaded.notice).toBeNull();
    expect(loaded.state).toEqual(s);
  });

  it('loads the fixtures on first run', () => {
    expect(loadState(memoryStorage())).toEqual({ state: createSeedState(), notice: null });
  });

  it('falls back to fixtures and keeps a backup when saved data is unreadable', () => {
    for (const bad of ['{{{', '{"app":"other"}', '{"app":"saha_knowledge_review_studio","state_version":99,"state":{}}']) {
      const storage = memoryStorage({ [STORAGE_KEY]: bad });
      const loaded = loadState(storage);
      expect(loaded.state).toEqual(createSeedState());
      expect(loaded.notice).toMatch(/could not be loaded/);
      expect(storage.data.get(STORAGE_BACKUP_KEY)).toBe(bad);
    }
  });
});
