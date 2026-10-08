// Structural validation for anything read from outside the running app:
// imported bundles and whatever is found in local storage. Errors name the
// path and say what was expected, so a failed import is actionable.

import {
  CLINICAL_FIELDS,
  CLINICAL_USE_STATUS,
  CONTENT_ORIGINS,
  CONTENT_TYPES,
  DECISION_STATUSES,
  EVIDENCE_STATES,
  FLAG_STATUSES,
  INCLUSION_DECISIONS,
  INTENDED_USES,
  PRIORITIES,
  PROFILE_FIELDS,
  REVIEW_STATES,
  SEED_SOURCES,
  SOURCE_TYPES,
  SUGGESTION_CATEGORIES,
  SUGGESTION_DECISIONS,
  URGENCIES,
  type AppState,
  type Dimension,
} from '../types';

type Obj = Record<string, unknown>;

export type ValidationResult = { ok: true; state: AppState } | { ok: false; errors: string[] };

const MAX_ERRORS = 20;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

class Checker {
  errors: string[] = [];

  err(path: string, message: string) {
    if (this.errors.length < MAX_ERRORS) this.errors.push(`${path}: ${message}`);
  }

  str(o: Obj, key: string, path: string, nonEmpty = false) {
    const v = o[key];
    if (typeof v !== 'string') this.err(`${path}.${key}`, 'expected text.');
    else if (nonEmpty && v.trim() === '') this.err(`${path}.${key}`, 'must not be empty.');
  }

  strOrNull(o: Obj, key: string, path: string) {
    const v = o[key];
    if (v !== null && typeof v !== 'string') this.err(`${path}.${key}`, 'expected text or null.');
  }

  bool(o: Obj, key: string, path: string) {
    if (typeof o[key] !== 'boolean') this.err(`${path}.${key}`, 'expected true or false.');
  }

  isTrue(o: Obj, key: string, path: string) {
    if (o[key] !== true) this.err(`${path}.${key}`, 'must be true. This tool only loads demo data.');
  }

  posInt(o: Obj, key: string, path: string) {
    const v = o[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) this.err(`${path}.${key}`, 'expected a whole number of 1 or more.');
  }

  oneOf(o: Obj, key: string, path: string, allowed: readonly string[]) {
    const v = o[key];
    if (typeof v !== 'string' || !allowed.includes(v)) {
      this.err(`${path}.${key}`, `expected one of: ${allowed.join(', ')}.`);
    }
  }

  obj(o: Obj, key: string, path: string): Obj | null {
    const v = o[key];
    if (!isObj(v)) {
      this.err(`${path}.${key}`, 'expected an object.');
      return null;
    }
    return v;
  }

  /** Returns the array's object items; reports anything that is not an object. */
  objs(o: Obj, key: string, path: string): Obj[] {
    const v = o[key];
    if (!Array.isArray(v)) {
      this.err(`${path}.${key}`, 'expected a list.');
      return [];
    }
    v.forEach((item, i) => {
      if (!isObj(item)) this.err(`${path}.${key}[${i}]`, 'expected an object.');
    });
    return v.filter(isObj);
  }

  strList(o: Obj, key: string, path: string, allowed?: readonly string[]) {
    const v = o[key];
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
      this.err(`${path}.${key}`, 'expected a list of text values.');
    } else if (allowed && v.some((x) => !allowed.includes(x))) {
      this.err(`${path}.${key}`, `values must be from: ${allowed.join(', ')}.`);
    }
  }

  unique(ids: unknown[], path: string) {
    const seen = new Set<unknown>();
    for (const id of ids) {
      if (seen.has(id)) this.err(path, `duplicate ID "${String(id)}".`);
      seen.add(id);
    }
  }
}

function checkTemplate(c: Checker, root: Obj): Set<unknown> {
  const t = c.obj(root, 'template', 'root');
  if (!t) return new Set();
  const p = 'template';
  for (const k of ['schema_version', 'template_id', 'label', 'design_status', 'condition_example', 'intended_audience']) {
    c.str(t, k, p);
  }
  c.posInt(t, 'template_version', p);
  c.isTrue(t, 'demo_only', p);
  if (t.clinical_use_status !== CLINICAL_USE_STATUS) c.err(`${p}.clinical_use_status`, 'must be "not_released".');
  const basis = c.obj(t, 'design_basis', p);
  if (basis) for (const k of ['source', 'passage', 'note']) c.str(basis, k, `${p}.design_basis`);

  const dims = c.objs(t, 'dimensions', p);
  if (Array.isArray(t.dimensions) && dims.length === 0) c.err(`${p}.dimensions`, 'must contain at least one dimension.');
  dims.forEach((d, i) => {
    const dp = `${p}.dimensions[${i}]`;
    c.str(d, 'id', dp, true);
    c.str(d, 'title', dp, true);
    for (const k of ['purpose_question', 'example_question', 'not_applicable_reason', 'reviewer_comment']) c.str(d, k, dp);
    c.oneOf(d, 'inclusion_decision', dp, INCLUSION_DECISIONS);
    if (d.inclusion_decision === 'not_applicable' && String(d.not_applicable_reason ?? '').trim() === '') {
      c.err(`${dp}.not_applicable_reason`, 'a reason is required when the decision is not_applicable.');
    }
  });
  c.unique(dims.map((d) => d.id), `${p}.dimensions`);

  c.objs(t, 'change_log', p).forEach((entry, i) => {
    const cp = `${p}.change_log[${i}]`;
    c.posInt(entry, 'version', cp);
    c.str(entry, 'timestamp', cp);
    c.str(entry, 'summary', cp);
  });
  return new Set(dims.map((d) => d.id));
}

function checkRecords(c: Checker, root: Obj, dimensionIds: Set<unknown>): Set<unknown> {
  const records = c.objs(root, 'knowledge_records', 'root');
  records.forEach((r, i) => {
    const p = `knowledge_records[${i}]`;
    for (const k of ['id', 'condition_id', 'dimension_id', 'title', 'original_content']) c.str(r, k, p, true);
    for (const k of [
      'applicability',
      'required_patient_information',
      'caregiver_role',
      'required_training',
      'urgency_note',
      'question_for_clinician',
    ]) {
      c.str(r, k, p);
    }
    c.posInt(r, 'version', p);
    c.strOrNull(r, 'edited_content', p);
    c.oneOf(r, 'content_type', p, CONTENT_TYPES);
    c.strList(r, 'intended_use', p, INTENDED_USES);
    c.oneOf(r, 'proposed_priority', p, PRIORITIES);
    c.oneOf(r, 'urgency', p, URGENCIES);
    c.oneOf(r, 'content_origin', p, CONTENT_ORIGINS);
    c.oneOf(r, 'seed_source', p, SEED_SOURCES);
    c.bool(r, 'needs_clinical_input', p);
    c.strList(r, 'evidence_reference_ids', p);
    c.oneOf(r, 'evidence_state', p, EVIDENCE_STATES);
    c.isTrue(r, 'demo_only', p);
    if (r.clinical_use_status !== CLINICAL_USE_STATUS) c.err(`${p}.clinical_use_status`, 'must be "not_released".');
    if (typeof r.dimension_id === 'string' && !dimensionIds.has(r.dimension_id)) {
      c.err(`${p}.dimension_id`, `"${r.dimension_id}" is not a dimension in this template.`);
    }
    const review = c.obj(r, 'review', p);
    if (review) {
      c.oneOf(review, 'state', `${p}.review`, REVIEW_STATES);
      c.str(review, 'comment', `${p}.review`);
      c.str(review, 'reviewer_name', `${p}.review`);
      c.strOrNull(review, 'timestamp', `${p}.review`);
    }
    c.objs(r, 'history', p).forEach((h, j) => {
      for (const k of ['timestamp', 'actor', 'action', 'detail']) c.str(h, k, `${p}.history[${j}]`);
    });
  });
  c.unique(records.map((r) => r.id), 'knowledge_records');
  return new Set(records.map((r) => r.id));
}

function checkReferences(c: Checker, root: Obj, recordIds: Set<unknown>) {
  const refs = c.objs(root, 'medical_references', 'root');
  refs.forEach((ref, i) => {
    const p = `medical_references[${i}]`;
    for (const k of ['id', 'record_id', 'source_title']) c.str(ref, k, p, true);
    for (const k of [
      'edition_or_date',
      'locator',
      'supplied_excerpt',
      'verification_note',
      'verifier_name',
      'verification_date',
      'added_at',
    ]) {
      c.str(ref, k, p);
    }
    c.oneOf(ref, 'source_type', p, SOURCE_TYPES);
    c.isTrue(ref, 'demo_only', p);
    if (typeof ref.record_id === 'string' && !recordIds.has(ref.record_id)) {
      c.err(`${p}.record_id`, `"${ref.record_id}" is not a knowledge record in this bundle.`);
    }
  });
  c.unique(refs.map((r) => r.id), 'medical_references');
}

function checkDraft(c: Checker, parent: Obj, key: string, path: string) {
  c.objs(parent, key, path).forEach((line, i) => {
    c.str(line, 'id', `${path}.${key}[${i}]`, true);
    c.str(line, 'text', `${path}.${key}[${i}]`);
  });
}

function checkExample(c: Checker, root: Obj) {
  const e = c.obj(root, 'care_plan_example', 'root');
  if (!e) return;
  const p = 'care_plan_example';
  c.isTrue(e, 'demo_only', p);
  c.isTrue(e, 'synthetic', p);
  c.str(e, 'label', p);

  const profile = c.obj(e, 'profile', p);
  if (profile) for (const k of PROFILE_FIELDS) c.str(profile, k, `${p}.profile`);
  const clinical = c.obj(e, 'clinical_fields', p);
  if (clinical) for (const k of CLINICAL_FIELDS) c.strOrNull(clinical, k, `${p}.clinical_fields`);

  checkDraft(c, e, 'original_draft', p);
  checkDraft(c, e, 'working_draft', p);

  const report = c.obj(e, 'reviewer_report', p);
  if (report) {
    const rp = `${p}.reviewer_report`;
    if (report.source !== 'saved_mock_fixture_no_model_call') {
      c.err(`${rp}.source`, 'must be "saved_mock_fixture_no_model_call".');
    }
    c.bool(report, 'loaded', rp);
    c.strOrNull(report, 'loaded_at', rp);
    c.objs(report, 'suggestions', rp).forEach((s, i) => {
      const sp = `${rp}.suggestions[${i}]`;
      c.str(s, 'id', sp, true);
      c.str(s, 'text', sp);
      c.str(s, 'rationale', sp);
      c.oneOf(s, 'category', sp, SUGGESTION_CATEGORIES);
      c.oneOf(s, 'decision', sp, SUGGESTION_DECISIONS);
      c.strList(s, 'record_ids', sp);
      c.strList(s, 'dimension_ids', sp);
      const effect = c.obj(s, 'effect', sp);
      if (effect) {
        c.oneOf(effect, 'op', `${sp}.effect`, ['retain', 'replace', 'remove', 'add']);
        if (effect.op === 'add' || effect.op === 'replace') c.str(effect, 'new_text', `${sp}.effect`, true);
        if (effect.op !== 'add') c.str(effect, 'target_line_id', `${sp}.effect`, true);
      }
    });
  }

  const scorecard = c.obj(e, 'scorecard', p);
  if (scorecard) {
    const sp = `${p}.scorecard`;
    c.str(scorecard, 'overall_note', sp);
    c.objs(scorecard, 'criteria', sp).forEach((crit, i) => {
      const cp = `${sp}.criteria[${i}]`;
      c.str(crit, 'id', cp, true);
      c.str(crit, 'label', cp);
      c.str(crit, 'note', cp);
      c.strList(crit, 'scale', cp);
      c.strOrNull(crit, 'rating', cp);
      if (typeof crit.rating === 'string' && Array.isArray(crit.scale) && !crit.scale.includes(crit.rating)) {
        c.err(`${cp}.rating`, 'must be one of this criterion’s scale values, or null.');
      }
    });
    c.objs(scorecard, 'critical_flags', sp).forEach((flag, i) => {
      const fp = `${sp}.critical_flags[${i}]`;
      c.str(flag, 'id', fp, true);
      c.str(flag, 'label', fp);
      c.oneOf(flag, 'status', fp, FLAG_STATUSES);
    });
  }
}

function checkRest(c: Checker, root: Obj) {
  c.objs(root, 'prompt_templates', 'root').forEach((pt, i) => {
    const p = `prompt_templates[${i}]`;
    c.str(pt, 'id', p, true);
    for (const k of ['title', 'text', 'default_text']) c.str(pt, k, p);
  });
  const decisions = c.objs(root, 'meeting_decisions', 'root');
  decisions.forEach((d, i) => {
    const p = `meeting_decisions[${i}]`;
    c.str(d, 'id', p, true);
    for (const k of ['question', 'decision', 'owner', 'next_action', 'due_date']) c.str(d, k, p);
    c.oneOf(d, 'status', p, DECISION_STATUSES);
  });
  c.unique(decisions.map((d) => d.id), 'meeting_decisions');
  c.str(root, 'meeting_notes', 'root');
  c.str(root, 'reviewer_name', 'root');
}

/**
 * Checks an unknown value against the app state shape. On success returns a
 * clean state containing only the fields this app owns.
 */
export function validateState(raw: unknown): ValidationResult {
  if (!isObj(raw)) return { ok: false, errors: ['root: expected a JSON object.'] };
  const c = new Checker();
  c.isTrue(raw, 'demo_only', 'root');
  if (raw.clinical_use_status !== CLINICAL_USE_STATUS) c.err('root.clinical_use_status', 'must be "not_released".');
  const dimensionIds = checkTemplate(c, raw);
  const recordIds = checkRecords(c, raw, dimensionIds);
  checkReferences(c, raw, recordIds);
  checkExample(c, raw);
  checkRest(c, raw);
  if (c.errors.length > 0) return { ok: false, errors: c.errors };

  const src = raw as unknown as AppState;
  const state: AppState = {
    demo_only: true,
    clinical_use_status: CLINICAL_USE_STATUS,
    template: {
      ...src.template,
      // knowledge_record_ids is derived on export; it is not stored.
      dimensions: src.template.dimensions.map((d) => {
        const { knowledge_record_ids: _derived, ...rest } = d as Dimension & { knowledge_record_ids?: unknown };
        return rest;
      }),
    },
    knowledge_records: src.knowledge_records,
    medical_references: src.medical_references,
    care_plan_example: src.care_plan_example,
    prompt_templates: src.prompt_templates,
    meeting_decisions: src.meeting_decisions,
    meeting_notes: src.meeting_notes,
    reviewer_name: src.reviewer_name,
  };
  return { ok: true, state };
}
