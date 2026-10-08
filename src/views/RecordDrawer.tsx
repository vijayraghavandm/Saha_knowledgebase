import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Badge, EditableText, formatTimestamp, nowIso, type Apply, type ViewProps } from '../components/common';
import {
  CONTENT_TYPE_LABELS,
  EVIDENCE_LABELS,
  INTENDED_USE_LABELS,
  ORIGIN_LABELS,
  PRIORITY_LABELS,
  REVIEW_ACTION_LABELS,
  REVIEW_STATE_LABELS,
  SEED_SOURCE_LABELS,
  SOURCE_TYPE_LABELS,
  URGENCY_LABELS,
} from '../labels';
import {
  addReference,
  editRecordContent,
  removeReference,
  reviewRecord,
  setEvidenceState,
  setReviewComment,
  setReviewerName,
  updateRecordMeta,
  updateReference,
  type ReferenceInput,
} from '../state/actions';
import {
  effectiveContent,
  evidenceBlockReason,
  isReferenceVerified,
  referencesForRecord,
  reviewBlockReason,
} from '../state/selectors';
import {
  CONTENT_ORIGINS,
  CONTENT_TYPES,
  EVIDENCE_STATES,
  INTENDED_USES,
  PRIORITIES,
  REVIEW_ACTIONS,
  SOURCE_TYPES,
  URGENCIES,
  type ContentOrigin,
  type ContentType,
  type EvidenceState,
  type KnowledgeRecord,
  type Priority,
  type SourceReference,
  type SourceType,
  type Urgency,
} from '../types';
import { EVIDENCE_TONES, REVIEW_TONES } from '../components/tones';

interface Props extends ViewProps {
  recordId: string;
  onClose: () => void;
}

const REFERENCE_TEXT_FIELDS: Array<{ key: Exclude<keyof ReferenceInput, 'source_type'>; label: string; multiline?: boolean; date?: boolean }> = [
  { key: 'source_title', label: 'Source title' },
  { key: 'edition_or_date', label: 'Edition/date' },
  { key: 'locator', label: 'Section/page or URL' },
  { key: 'supplied_excerpt', label: 'Supplied excerpt', multiline: true },
  { key: 'verification_note', label: 'Verification note', multiline: true },
  { key: 'verifier_name', label: 'Verifier name (as typed)' },
  { key: 'verification_date', label: 'Verification date', date: true },
];

const EMPTY_REFERENCE: ReferenceInput = {
  source_title: '',
  edition_or_date: '',
  locator: '',
  supplied_excerpt: '',
  source_type: 'guideline',
  verification_note: '',
  verifier_name: '',
  verification_date: '',
};

function ReferenceCard({ reference, apply }: { reference: SourceReference; apply: Apply }) {
  return (
    <li className="ref-card" data-testid={`reference-${reference.id}`}>
      <div className="ref-head">
        <strong>{reference.id}</strong>
        <Badge tone={isReferenceVerified(reference) ? 'sage' : 'amber'}>
          {isReferenceVerified(reference) ? 'Verification recorded' : 'Verification incomplete'}
        </Badge>
        <button type="button" className="btn-small" onClick={() => apply((s) => removeReference(s, reference.id, nowIso()))}>
          Remove reference
        </button>
      </div>
      <div className="form-grid two">
        {REFERENCE_TEXT_FIELDS.map((f) => (
          <EditableText
            key={f.key}
            showLabel
            label={f.label}
            multiline={f.multiline}
            type={f.date ? 'date' : 'text'}
            value={reference[f.key]}
            onCommit={(v) => {
              if (f.key === 'source_title' && v.trim() === '') return false;
              const patch: Partial<ReferenceInput> = {};
              patch[f.key] = v;
              apply((s) => updateReference(s, reference.id, patch, nowIso()));
            }}
          />
        ))}
        <div className="field">
          <label htmlFor={`${reference.id}-type`}>Source type</label>
          <select
            id={`${reference.id}-type`}
            value={reference.source_type}
            onChange={(e) =>
              apply((s) => updateReference(s, reference.id, { source_type: e.target.value as SourceType }, nowIso()))
            }
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}

function AddReferenceForm({ recordId, apply }: { recordId: string; apply: Apply }) {
  const [form, setForm] = useState<ReferenceInput>(EMPTY_REFERENCE);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.source_title.trim() === '') {
      setError('Enter the source title.');
      return;
    }
    apply((s) => addReference(s, recordId, form, nowIso()));
    setForm(EMPTY_REFERENCE);
    setError(null);
  };

  return (
    <form className="ref-form" onSubmit={submit} aria-label="Add a source reference">
      <h4>Add a source reference</h4>
      <div className="form-grid two">
        {REFERENCE_TEXT_FIELDS.map((f) => {
          const id = `new-ref-${f.key}`;
          const invalid = f.key === 'source_title' && error !== null;
          return (
            <div className="field" key={f.key}>
              <label htmlFor={id}>{f.label}</label>
              {f.multiline ? (
                <textarea id={id} rows={2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : (
                <input
                  id={id}
                  type={f.date ? 'date' : 'text'}
                  value={form[f.key]}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? 'new-ref-error' : undefined}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
              {invalid && (
                <p className="field-error" id="new-ref-error">
                  {error}
                </p>
              )}
            </div>
          );
        })}
        <div className="field">
          <label htmlFor="new-ref-type">Source type</label>
          <select
            id="new-ref-type"
            value={form.source_type}
            onChange={(e) => setForm({ ...form, source_type: e.target.value as SourceType })}
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="button-row">
        <button type="submit" className="btn-primary btn-small">
          Add reference
        </button>
      </div>
    </form>
  );
}

function DrawerBody({ record, state, apply, onClose }: { record: KnowledgeRecord } & ViewProps & { onClose: () => void }) {
  const current = effectiveContent(record);
  const [draft, setDraft] = useState(current);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => setDraft(current), [record.id, current]);
  useEffect(() => headingRef.current?.focus(), [record.id]);

  const refs = referencesForRecord(state, record.id);
  const dirty = draft.trim() !== current;
  const meta = (patch: Parameters<typeof updateRecordMeta>[2]) =>
    apply((s) => updateRecordMeta(s, record.id, patch, nowIso()));
  const toggleUse = (use: (typeof INTENDED_USES)[number]) =>
    meta({
      intended_use: record.intended_use.includes(use)
        ? record.intended_use.filter((u) => u !== use)
        : INTENDED_USES.filter((u) => u === use || record.intended_use.includes(u)),
    });

  const blockReasons = REVIEW_ACTIONS.map((a) => ({ action: a, reason: reviewBlockReason(record, a, draft) }));
  const evidenceReasons = EVIDENCE_STATES.map((ev) => ({ value: ev, reason: evidenceBlockReason(state, record.id, ev) }));

  return (
    <>
      <header className="drawer-head">
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            {record.id} <span className="muted">v{record.version}</span>
          </h2>
          <div className="tag-row">
            <Badge tone="teal">demo_only</Badge>
            <Badge tone="outline">Clinical use: Not released</Badge>
            <Badge tone={REVIEW_TONES[record.review.state]}>{REVIEW_STATE_LABELS[record.review.state]}</Badge>
            <Badge tone={EVIDENCE_TONES[record.evidence_state]}>Evidence: {EVIDENCE_LABELS[record.evidence_state]}</Badge>
          </div>
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

      <section className="drawer-section" aria-labelledby="sec-content">
        <h3 id="sec-content">Content</h3>
        <p className="muted">
          {ORIGIN_LABELS[record.content_origin]} · {SEED_SOURCE_LABELS[record.seed_source]}. Not an evidence-backed
          recommendation.
        </p>
        <EditableText
          showLabel
          label="Title"
          value={record.title}
          onCommit={(v) => {
            if (v.trim() === '') return false;
            apply((s) => editRecordContent(s, record.id, { title: v }, nowIso()));
          }}
        />
        <div className="field">
          <span className="label">Original content (kept unchanged)</span>
          <p className="readonly" data-testid="original-content">
            {record.original_content}
          </p>
        </div>
        <div className="field">
          <label htmlFor="content-draft">Current wording (editable)</label>
          <textarea
            id="content-draft"
            rows={3}
            value={draft}
            aria-invalid={draft.trim() === ''}
            onChange={(e) => setDraft(e.target.value)}
          />
          {draft.trim() === '' && <p className="field-error">Content cannot be empty.</p>}
        </div>
        <div className="button-row">
          <button
            type="button"
            disabled={!dirty || draft.trim() === ''}
            title={dirty ? undefined : 'No unsaved edit'}
            onClick={() => apply((s) => editRecordContent(s, record.id, { content: draft }, nowIso()))}
          >
            Save edit
          </button>
          <button type="button" disabled={!dirty} title={dirty ? undefined : 'No unsaved edit'} onClick={() => setDraft(current)}>
            Discard edit
          </button>
          <button
            type="button"
            disabled={current === record.original_content}
            title={current === record.original_content ? 'Wording already matches the original' : undefined}
            onClick={() => apply((s) => editRecordContent(s, record.id, { content: record.original_content }, nowIso()))}
          >
            Restore original wording
          </button>
        </div>
        <p className="muted">Saving an edit to accepted content returns the record to Needs re-review. History is kept.</p>
      </section>

      <section className="drawer-section" aria-labelledby="sec-review">
        <h3 id="sec-review">Review</h3>
        <p className="callout small">
          Accepting does not verify evidence, establish permission to perform a task, or approve patient use. Clinical-use
          status stays <strong>Not released</strong> in this demonstration.
        </p>
        <div className="form-grid two">
          <EditableText
            showLabel
            label="Reviewer name (typed, not authenticated)"
            placeholder="Not entered"
            value={state.reviewer_name}
            onCommit={(v) => apply((s) => setReviewerName(s, v.trim()))}
          />
          <div className="field">
            <span className="label">Last decision</span>
            <p className="readonly" data-testid="review-summary">
              {REVIEW_STATE_LABELS[record.review.state]}
              {record.review.timestamp && (
                <>
                  {' '}
                  · {formatTimestamp(record.review.timestamp)} · {record.review.reviewer_name || 'Name not entered'}
                </>
              )}
            </p>
          </div>
        </div>
        <EditableText
          showLabel
          multiline
          label="Review comment"
          placeholder="Add a comment before choosing a decision"
          value={record.review.comment}
          onCommit={(v) => apply((s) => setReviewComment(s, record.id, v))}
        />
        <div className="review-actions" role="group" aria-label="Review decision">
          {blockReasons.map(({ action, reason }) => (
            <button
              key={action}
              type="button"
              className={action === 'accept' || action === 'edit_and_accept' ? 'btn-primary' : ''}
              disabled={reason !== null}
              title={reason ?? undefined}
              onClick={() => apply((s) => reviewRecord(s, record.id, action, nowIso(), draft))}
            >
              {REVIEW_ACTION_LABELS[action]}
            </button>
          ))}
        </div>
        <ul className="reasons">
          {blockReasons
            .filter((b) => b.reason)
            .map((b) => (
              <li key={b.action}>
                <strong>{REVIEW_ACTION_LABELS[b.action]}</strong> is unavailable: {b.reason}
              </li>
            ))}
        </ul>
      </section>

      <section className="drawer-section" aria-labelledby="sec-class">
        <h3 id="sec-class">Classification</h3>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="rec-dim">Dimension</label>
            <select id="rec-dim" value={record.dimension_id} onChange={(e) => meta({ dimension_id: e.target.value })}>
              {state.template.dimensions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} — {d.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rec-type">Content type</label>
            <select id="rec-type" value={record.content_type} onChange={(e) => meta({ content_type: e.target.value as ContentType })}>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rec-priority">Proposed priority</label>
            <select
              id="rec-priority"
              value={record.proposed_priority}
              onChange={(e) => meta({ proposed_priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rec-urgency">Urgency</label>
            <select id="rec-urgency" value={record.urgency} onChange={(e) => meta({ urgency: e.target.value as Urgency })}>
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {URGENCY_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted">A priority label is not a severity assessment. Urgency is never derived from priority.</p>
        {record.urgency === 'clinician_defined' && (
          <EditableText
            showLabel
            label="Urgency as defined by the clinician"
            placeholder="Enter the clinician's wording. Left blank until supplied."
            value={record.urgency_note}
            onCommit={(v) => meta({ urgency_note: v })}
          />
        )}
        <fieldset className="checks">
          <legend>Used in</legend>
          {INTENDED_USES.map((u) => (
            <label key={u}>
              <input type="checkbox" checked={record.intended_use.includes(u)} onChange={() => toggleUse(u)} />
              {INTENDED_USE_LABELS[u]}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor="rec-origin">Content origin</label>
          <select id="rec-origin" value={record.content_origin} onChange={(e) => meta({ content_origin: e.target.value as ContentOrigin })}>
            {CONTENT_ORIGINS.map((o) => (
              <option key={o} value={o}>
                {ORIGIN_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="drawer-section" aria-labelledby="sec-context">
        <h3 id="sec-context">Applicability and role</h3>
        <div className="form-grid two">
          <EditableText showLabel multiline label="Applicability" placeholder="Not specified" value={record.applicability} onCommit={(v) => meta({ applicability: v })} />
          <EditableText
            showLabel
            multiline
            label="Required patient information"
            placeholder="Not specified"
            value={record.required_patient_information}
            onCommit={(v) => meta({ required_patient_information: v })}
          />
          <EditableText showLabel label="Caregiver role" placeholder="Unknown" value={record.caregiver_role} onCommit={(v) => meta({ caregiver_role: v })} />
          <EditableText
            showLabel
            label="Required training/authorisation"
            placeholder="Unknown"
            value={record.required_training}
            onCommit={(v) => meta({ required_training: v })}
          />
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={record.needs_clinical_input}
            onChange={(e) => meta({ needs_clinical_input: e.target.checked })}
          />
          Needs clinical source/input
        </label>
        {record.needs_clinical_input && (
          <EditableText
            showLabel
            multiline
            label="Question for the clinician"
            placeholder="What exactly should the clinician supply or select?"
            value={record.question_for_clinician}
            onCommit={(v) => meta({ question_for_clinician: v })}
          />
        )}
      </section>

      <section className="drawer-section" aria-labelledby="sec-evidence">
        <h3 id="sec-evidence">Evidence and source references</h3>
        <div className="field">
          <label htmlFor="rec-evidence">Evidence state</label>
          <select
            id="rec-evidence"
            value={record.evidence_state}
            onChange={(e) => apply((s) => setEvidenceState(s, record.id, e.target.value as EvidenceState, nowIso()))}
          >
            {evidenceReasons.map(({ value, reason }) => (
              <option key={value} value={value} disabled={reason !== null && value !== record.evidence_state}>
                {EVIDENCE_LABELS[value]}
                {reason !== null && value !== record.evidence_state ? ' (unavailable)' : ''}
              </option>
            ))}
          </select>
        </div>
        <ul className="reasons">
          {evidenceReasons
            .filter((e) => e.reason && e.value !== record.evidence_state)
            .map((e) => (
              <li key={e.value}>
                <strong>{EVIDENCE_LABELS[e.value]}</strong> is unavailable: {e.reason}
              </li>
            ))}
        </ul>
        <p className="muted">
          Adding a reference, or typing a URL, moves evidence to Unverified at most. Supported is chosen by a person after
          verification is recorded. Verifier names are typed, not authenticated.
        </p>
        {refs.length === 0 ? (
          <p className="empty">No source references have been supplied for this record.</p>
        ) : (
          <ul className="ref-list">
            {refs.map((ref) => (
              <ReferenceCard key={ref.id} reference={ref} apply={apply} />
            ))}
          </ul>
        )}
        <AddReferenceForm recordId={record.id} apply={apply} />
      </section>

      <section className="drawer-section" aria-labelledby="sec-history">
        <h3 id="sec-history">Edit history ({record.history.length})</h3>
        {record.history.length === 0 ? (
          <p className="empty">No edits or decisions recorded yet.</p>
        ) : (
          <ol className="log" data-testid="record-history">
            {[...record.history].reverse().map((h, i) => (
              <li key={`${h.timestamp}-${i}`}>
                <strong>{h.action}</strong> · {h.detail}
                <span className="muted">
                  {' '}
                  · {formatTimestamp(h.timestamp)} · {h.actor || 'Name not entered'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

export function RecordDrawer({ state, apply, recordId, onClose }: Props) {
  const record = state.knowledge_records.find((r) => r.id === recordId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="drawer" role="dialog" aria-label={`Record ${recordId} details`} data-testid="record-drawer">
      {record ? (
        <DrawerBody key={record.id} record={record} state={state} apply={apply} onClose={onClose} />
      ) : (
        <div className="drawer-section">
          <p className="empty">Record {recordId} is not in the current data.</p>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </aside>
  );
}
