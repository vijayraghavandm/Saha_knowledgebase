import {
  CLINICAL_FIELD_LABELS,
  CONTENT_TYPE_LABELS,
  DECISION_STATUS_LABELS,
  DEMO_BANNER,
  EVIDENCE_LABELS,
  FLAG_STATUS_LABELS,
  INCLUSION_LABELS,
  INTENDED_USE_LABELS,
  ORIGIN_LABELS,
  PRIORITY_LABELS,
  PROFILE_LABELS,
  REVIEW_STATE_LABELS,
  REVISION_ORIGIN_LABELS,
  SOURCE_TYPE_LABELS,
  SUGGESTION_CATEGORY_LABELS,
  URGENCY_LABELS,
} from '../labels';
import { CLINICAL_FIELDS, CLINICAL_USE_STATUS, PROFILE_FIELDS, SUGGESTION_CATEGORIES, type AppState } from '../types';
import { effectiveContent, recordsForDimension, selectedRevision, workflowCounts } from './selectors';
import { validateState, type ValidationResult } from './validate';

export const BUNDLE_FORMAT = 'saha_knowledge_review_bundle';
export const BUNDLE_VERSION = 1;

const EXPORT_LABEL = `DRAFT / DEMO ONLY — ${DEMO_BANNER}`;

/** One versioned JSON bundle holding everything in the current local state. */
export function buildBundle(state: AppState, now: string) {
  return {
    bundle_format: BUNDLE_FORMAT,
    bundle_version: BUNDLE_VERSION,
    exported_at: now,
    label: EXPORT_LABEL,
    demo_only: true as const,
    clinical_use_status: CLINICAL_USE_STATUS,
    bundle_notes: [
      'Synthetic meeting data. Not clinically validated. Not for patient care.',
      'Reviewer and verifier names were typed into a local prototype and are not authenticated identities.',
      'review_decisions, revised_demo_plan, and workflow_counts are derived views; they are recomputed on import.',
      'workflow_counts are workflow counts, not clinical quality or validation scores.',
    ],
    template: {
      ...state.template,
      dimensions: state.template.dimensions.map((d) => ({
        ...d,
        knowledge_record_ids: recordsForDimension(state, d.id).map((r) => r.id),
      })),
    },
    knowledge_records: state.knowledge_records,
    medical_references: state.medical_references,
    review_decisions: state.knowledge_records.map((r) => ({
      record_id: r.id,
      record_version: r.version,
      review_state: r.review.state,
      comment: r.review.comment,
      reviewer_name_as_typed: r.review.reviewer_name,
      timestamp: r.review.timestamp,
      evidence_state: r.evidence_state,
      clinical_use_status: r.clinical_use_status,
    })),
    care_plan_example: state.care_plan_example,
    revised_demo_plan: selectedRevision(state.care_plan_example),
    prompt_templates: state.prompt_templates,
    meeting_decisions: state.meeting_decisions,
    meeting_notes: state.meeting_notes,
    reviewer_name: state.reviewer_name,
    workflow_counts: workflowCounts(state),
  };
}

export function exportJson(state: AppState, now: string): string {
  return JSON.stringify(buildBundle(state, now), null, 2);
}

/** Parses and validates an exported bundle. Never touches existing state. */
export function parseBundle(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      errors: [`The file is not valid JSON (${e instanceof Error ? e.message : 'parse error'}). Choose a file exported from this tool.`],
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, errors: ['The file must contain one JSON object exported from this tool.'] };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.bundle_format !== BUNDLE_FORMAT) {
    return {
      ok: false,
      errors: [`bundle_format: expected "${BUNDLE_FORMAT}". This does not look like a Saha Knowledge Review Studio export.`],
    };
  }
  if (obj.bundle_version !== BUNDLE_VERSION) {
    return {
      ok: false,
      errors: [`bundle_version: this build reads version ${BUNDLE_VERSION}, but the file is version ${String(obj.bundle_version)}.`],
    };
  }
  return validateState(obj);
}

// ---------- Markdown ----------

const cell = (s: string) => (s.trim() === '' ? '—' : s.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' '));
const orBlank = (s: string, blank: string) => (s.trim() === '' ? blank : s);

export function exportMarkdown(state: AppState, now: string): string {
  const out: string[] = [];
  const counts = workflowCounts(state);
  const t = state.template;
  const example = state.care_plan_example;

  out.push(
    '# Saha Knowledge Review Studio — meeting export',
    '',
    `> **${EXPORT_LABEL}**`,
    '>',
    '> demo_only: true · clinical_use_status: not_released · Not clinically validated.',
    '> Reviewer names were typed into a local prototype and are not authenticated identities.',
    '',
    `Exported: ${now}`,
    '',
    '## Workflow counts',
    '',
    'These are workflow counts, not clinical quality or validation scores.',
    '',
    `- Dimensions present: ${counts.dimensions_present}`,
    `- Records reviewed: ${counts.records_reviewed} of ${counts.records_total}`,
    `- Records needing evidence: ${counts.records_needing_evidence}`,
    `- Records missing patient information: ${counts.records_missing_patient_information}`,
    `- Open decisions: ${counts.open_decisions}`,
    '',
    `## Disease template (v${t.template_version})`,
    '',
    `${t.label}. Condition example: ${t.condition_example}. Design status: ${t.design_status}.`,
    '',
    'These are knowledge-coverage dimensions, not mandatory daily caregiver tasks.',
    '',
    '| ID | Title | Purpose | Example question | Inclusion | Reviewer comment | Records |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const d of t.dimensions) {
    const inclusion =
      d.inclusion_decision === 'not_applicable'
        ? `${INCLUSION_LABELS[d.inclusion_decision]} — ${d.not_applicable_reason}`
        : INCLUSION_LABELS[d.inclusion_decision];
    const ids = recordsForDimension(state, d.id).map((r) => r.id);
    out.push(
      `| ${d.id} | ${cell(d.title)} | ${cell(d.purpose_question)} | ${cell(d.example_question)} | ${cell(inclusion)} | ${cell(d.reviewer_comment)} | ${ids.length ? ids.join(', ') : 'None'} |`,
    );
  }

  out.push(
    '',
    `## ${t.condition_example} knowledge records`,
    '',
    'Synthetic discussion examples, not evidence-backed recommendations. An acceptance does not verify evidence, grant permission to perform a task, or approve patient use.',
    '',
  );
  for (const r of state.knowledge_records) {
    const refs = state.medical_references.filter((ref) => ref.record_id === r.id);
    out.push(
      `### ${r.id} (v${r.version}) — ${r.title}`,
      '',
      `- Dimension: ${r.dimension_id}`,
      `- Type: ${CONTENT_TYPE_LABELS[r.content_type]}`,
      `- Content: ${effectiveContent(r)}`,
    );
    if (r.edited_content !== null) out.push(`- Original content: ${r.original_content}`);
    out.push(
      `- Used in: ${r.intended_use.length ? r.intended_use.map((u) => INTENDED_USE_LABELS[u]).join(', ') : 'Not set'}`,
      `- Applicability: ${orBlank(r.applicability, 'Not specified')}`,
      `- Required patient information: ${orBlank(r.required_patient_information, 'Not specified')}`,
      `- Caregiver role: ${orBlank(r.caregiver_role, 'Unknown')} · Required training/authorisation: ${orBlank(r.required_training, 'Unknown')}`,
      `- Proposed priority: ${PRIORITY_LABELS[r.proposed_priority]} · Urgency: ${URGENCY_LABELS[r.urgency]}${r.urgency_note ? ` (${r.urgency_note})` : ''}`,
      `- Content origin: ${ORIGIN_LABELS[r.content_origin]}`,
      `- Review state: ${REVIEW_STATE_LABELS[r.review.state]}${r.review.timestamp ? ` · ${r.review.timestamp}` : ''}${r.review.reviewer_name ? ` · reviewer name as typed: ${r.review.reviewer_name}` : ''}`,
    );
    if (r.review.comment) out.push(`- Review comment: ${r.review.comment}`);
    out.push(`- Evidence state: ${EVIDENCE_LABELS[r.evidence_state]} · References: ${refs.length ? refs.map((x) => x.id).join(', ') : 'None'}`);
    if (r.needs_clinical_input) {
      out.push(`- Needs clinical source/input. Question for the clinician: ${orBlank(r.question_for_clinician, 'Not written yet')}`);
    }
    out.push('- Clinical-use status: Not released · demo_only: true');
    if (r.history.length) out.push(`- History entries: ${r.history.length}`);
    out.push('');
  }

  out.push('## Source references', '');
  if (state.medical_references.length === 0) {
    out.push('No medical references have been supplied.', '');
  } else {
    for (const ref of state.medical_references) {
      out.push(
        `### ${ref.id} — ${ref.source_title}`,
        '',
        `- Record: ${ref.record_id}`,
        `- Source type: ${SOURCE_TYPE_LABELS[ref.source_type]}`,
        `- Edition/date: ${orBlank(ref.edition_or_date, 'Not entered')}`,
        `- Section/page or URL: ${orBlank(ref.locator, 'Not entered')}`,
        `- Supplied excerpt: ${orBlank(ref.supplied_excerpt, 'Not entered')}`,
        `- Verification note: ${orBlank(ref.verification_note, 'Not entered')}`,
        `- Verifier name as typed: ${orBlank(ref.verifier_name, 'Not entered')} · Verification date: ${orBlank(ref.verification_date, 'Not entered')}`,
        '',
      );
    }
  }

  out.push(
    '## Care-plan review example (synthetic)',
    '',
    `${example.label} This is a reviewer-only preview; nothing is sent to a caregiver. The baseline draft is not a reproduction of Saha's production output.`,
    '',
    '### Profile',
    '',
  );
  for (const k of PROFILE_FIELDS) out.push(`- ${PROFILE_LABELS[k]}: ${orBlank(example.profile[k], 'Not entered')}`);
  out.push('', '### Patient-specific clinical fields', '');
  for (const k of CLINICAL_FIELDS) {
    out.push(`- ${CLINICAL_FIELD_LABELS[k]}: ${example.clinical_fields[k] ?? 'NOT SUPPLIED (gap)'}`);
  }
  out.push('', '### Original baseline draft (preserved)', '');
  example.original_draft.forEach((l) => out.push(`- ${l.text}`));
  out.push('', '### Working draft', '');
  example.working_draft.forEach((l) => out.push(`- ${l.text}`));

  out.push('', '### Example reviewer report (saved mock, no model call)', '');
  if (!example.reviewer_report.loaded) {
    out.push('Not loaded in this session.', '');
  } else {
    for (const cat of SUGGESTION_CATEGORIES) {
      const items = example.reviewer_report.suggestions.filter((s) => s.category === cat);
      if (items.length === 0) continue;
      out.push(`**${SUGGESTION_CATEGORY_LABELS[cat]}**`, '');
      for (const s of items) {
        out.push(
          `- ${s.id} [${s.decision}] ${s.text} — ${s.rationale} (records: ${s.record_ids.join(', ') || 'none'}; dimensions: ${s.dimension_ids.join(', ') || 'none'})`,
        );
      }
      out.push('');
    }
  }
  out.push('### Selected revision (reviewer-only preview)', '');
  selectedRevision(example).forEach((l) =>
    out.push(`- [${REVISION_ORIGIN_LABELS[l.origin]}${l.suggestion_id ? ` ${l.suggestion_id}` : ''}] ${l.text}`),
  );

  out.push('', '### Review scorecard', '', 'No average or overall score is calculated.', '');
  for (const c of example.scorecard.criteria) {
    out.push(`- ${c.label}: ${c.rating ?? 'Not rated'}${c.note ? ` — ${c.note}` : ''}`);
  }
  out.push('', '**Critical-issue flags**', '');
  for (const f of example.scorecard.critical_flags) out.push(`- ${f.label}: ${FLAG_STATUS_LABELS[f.status]}`);
  if (example.scorecard.overall_note) out.push('', `Scorecard note: ${example.scorecard.overall_note}`);

  out.push('', '## Prompt templates (text only, not run)', '');
  for (const p of state.prompt_templates) out.push(`### ${p.title}`, '', '```text', p.text, '```', '');

  out.push(
    '## Meeting decisions',
    '',
    '| ID | Question | Decision | Owner | Next action | Due date | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const d of state.meeting_decisions) {
    out.push(
      `| ${d.id} | ${cell(d.question)} | ${cell(d.decision)} | ${cell(orBlank(d.owner, 'Unassigned'))} | ${cell(d.next_action)} | ${cell(orBlank(d.due_date, 'Not set'))} | ${DECISION_STATUS_LABELS[d.status]} |`,
    );
  }
  out.push('', '## Meeting notes', '', orBlank(state.meeting_notes, 'No notes entered.'), '', '---', '', `**${EXPORT_LABEL}**`, '');
  return out.join('\n');
}
