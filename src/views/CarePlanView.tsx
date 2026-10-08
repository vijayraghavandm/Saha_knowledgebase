import { useState } from 'react';
import { Badge, EditableText, nowIso, type Tone, type ViewProps } from '../components/common';
import {
  CLINICAL_FIELD_LABELS,
  FLAG_STATUS_LABELS,
  PROFILE_LABELS,
  REVISION_ORIGIN_LABELS,
  SUGGESTION_CATEGORY_LABELS,
} from '../labels';
import {
  addDraftLine,
  decideSuggestion,
  editDraftLine,
  removeDraftLine,
  resetPromptText,
  restoreWorkingDraft,
  setClinicalField,
  setCriticalFlag,
  setProfileField,
  setPromptText,
  setReviewerReportLoaded,
  setScoreNote,
  setScoreRating,
  setScorecardNote,
} from '../state/actions';
import { selectedRevision } from '../state/selectors';
import {
  CLINICAL_FIELDS,
  FLAG_STATUSES,
  PROFILE_FIELDS,
  SUGGESTION_CATEGORIES,
  type FlagStatus,
  type PromptTemplate,
  type RevisionLine,
  type SuggestionDecision,
} from '../types';

interface Props extends ViewProps {
  onOpenRecord: (recordId: string) => void;
  onOpenDimensionRecords: (dimensionId: string) => void;
}

const DECISION_TONES: Record<SuggestionDecision, Tone> = { pending: 'neutral', accepted: 'sage', rejected: 'coral' };
const DECISION_LABELS: Record<SuggestionDecision, string> = {
  pending: 'Not decided',
  accepted: 'Change accepted',
  rejected: 'Change rejected',
};
const ORIGIN_TONES: Record<RevisionLine['origin'], Tone> = {
  draft_unchanged: 'neutral',
  retained: 'teal',
  replaced: 'amber',
  added: 'sage',
};

function PromptEditor({ prompt, apply }: { prompt: PromptTemplate } & Pick<ViewProps, 'apply'>) {
  const [copyStatus, setCopyStatus] = useState('');
  const id = `prompt-${prompt.id}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.text);
      setCopyStatus('Copied to clipboard.');
    } catch {
      setCopyStatus('Copy was blocked by the browser. Select the text and copy it manually.');
    }
  };
  return (
    <div className="prompt">
      <label htmlFor={id}>{prompt.title}</label>
      <textarea
        id={id}
        className="prompt-text"
        rows={12}
        spellCheck={false}
        value={prompt.text}
        onChange={(e) => apply((s) => setPromptText(s, prompt.id, e.target.value))}
      />
      <div className="button-row">
        <button type="button" onClick={copy}>
          Copy prompt
        </button>
        <button
          type="button"
          disabled={prompt.text === prompt.default_text}
          title={prompt.text === prompt.default_text ? 'Already the default text' : undefined}
          onClick={() => apply((s) => resetPromptText(s, prompt.id))}
        >
          Restore default text
        </button>
        <span className="muted" role="status">
          {copyStatus}
        </span>
      </div>
    </div>
  );
}

export function CarePlanView({ state, apply, onOpenRecord, onOpenDimensionRecords }: Props) {
  const example = state.care_plan_example;
  const report = example.reviewer_report;
  const revision = selectedRevision(example);
  const [newLine, setNewLine] = useState('');
  const accepted = report.suggestions.filter((s) => s.decision === 'accepted').length;
  const draftEdited = JSON.stringify(example.working_draft) !== JSON.stringify(example.original_draft);
  const knownRecords = new Set(state.knowledge_records.map((r) => r.id));
  const knownDimensions = new Set(state.template.dimensions.map((d) => d.id));

  return (
    <section aria-labelledby="care-title">
      <header className="view-head">
        <div>
          <h1 id="care-title">Care-plan review example</h1>
          <p className="view-meta">Synthetic elder · Reviewer-only preview · Nothing is sent to a caregiver</p>
        </div>
      </header>

      <p className="callout">
        <strong>Patient-plan review is separate from knowledge review.</strong> An accepted knowledge record is not a
        patient-approved care plan. This draft is synthetic and is <strong>not</strong> a reproduction of Saha&rsquo;s
        current production output.
      </p>

      <div className="two-col">
        <div className="panel">
          <h2>Elder profile (synthetic, editable)</h2>
          <p className="muted">{example.label}</p>
          <div className="form-grid two">
            {PROFILE_FIELDS.map((k) => (
              <EditableText
                key={k}
                showLabel
                multiline
                label={PROFILE_LABELS[k]}
                placeholder="Not entered"
                value={example.profile[k]}
                onCommit={(v) => apply((s) => setProfileField(s, k, v))}
              />
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Patient-specific clinical fields</h2>
          <p className="muted">
            Empty unless genuinely supplied by a clinician for this review. Nothing here is filled in automatically, and an
            empty field is shown as a gap.
          </p>
          <ul className="gap-list">
            {CLINICAL_FIELDS.map((k) => {
              const value = example.clinical_fields[k];
              return (
                <li key={k} data-testid={`clinical-${k}`}>
                  <div className="gap-head">
                    <strong>{CLINICAL_FIELD_LABELS[k]}</strong>
                    {value === null ? <Badge tone="coral">Not supplied — gap</Badge> : <Badge tone="outline">Entered by reviewer</Badge>}
                  </div>
                  <EditableText
                    multiline
                    label={`${CLINICAL_FIELD_LABELS[k]} as supplied by a clinician`}
                    placeholder="Not supplied. Leave empty unless a clinician has provided this."
                    value={value ?? ''}
                    onCommit={(v) => apply((s) => setClinicalField(s, k, v))}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>Baseline draft (editable working copy)</h2>
          <p className="muted">
            A synthetic draft that concentrates on monitoring and leaves broader care dimensions incomplete. Edits here
            change the working copy only.
          </p>
          <ol className="draft" data-testid="working-draft">
            {example.working_draft.map((line) => (
              <li key={line.id}>
                <span className="line-id">{line.id}</span>
                <EditableText
                  multiline
                  label={`Draft line ${line.id}`}
                  value={line.text}
                  onCommit={(v) => apply((s) => editDraftLine(s, line.id, v))}
                />
                <button
                  type="button"
                  className="btn-small"
                  aria-label={`Remove draft line ${line.id}`}
                  onClick={() => apply((s) => removeDraftLine(s, line.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
          {example.working_draft.length === 0 && <p className="empty">The working draft has no lines.</p>}
          <div className="inline-add">
            <div className="field grow">
              <label htmlFor="new-draft-line">Add a draft line</label>
              <input id="new-draft-line" type="text" value={newLine} onChange={(e) => setNewLine(e.target.value)} />
            </div>
            <button
              type="button"
              disabled={newLine.trim() === ''}
              title={newLine.trim() === '' ? 'Type a line first' : undefined}
              onClick={() => {
                apply((s) => addDraftLine(s, newLine));
                setNewLine('');
              }}
            >
              Add line
            </button>
            <button
              type="button"
              disabled={!draftEdited}
              title={draftEdited ? undefined : 'Working copy matches the original'}
              onClick={() => apply(restoreWorkingDraft)}
            >
              Restore from original
            </button>
          </div>

          <details open>
            <summary>Original draft (preserved, read-only)</summary>
            <ol className="draft readonly-draft" data-testid="original-draft">
              {example.original_draft.map((line) => (
                <li key={line.id}>
                  <span className="line-id">{line.id}</span>
                  <span>{line.text}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>

        <div className="panel">
          <h2>Example reviewer report</h2>
          <p className="muted">
            A saved mock report stored with this prototype. Loading it reads a local fixture; no model or clinical service
            is called. It proposes no treatments.
          </p>
          {!report.loaded ? (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={() => apply((s) => setReviewerReportLoaded(s, true, nowIso()))}
              >
                Load example reviewer output — no model call
              </button>
              <p className="empty">No reviewer output loaded yet.</p>
            </>
          ) : (
            <>
              <div className="button-row">
                <Badge tone="teal">Saved mock fixture · no model call</Badge>
                <button type="button" className="btn-small" onClick={() => apply((s) => setReviewerReportLoaded(s, false, nowIso()))}>
                  Hide example output
                </button>
              </div>
              {SUGGESTION_CATEGORIES.map((cat) => {
                const items = report.suggestions.filter((s) => s.category === cat);
                return (
                  <div key={cat} className="suggestion-group">
                    <h3>{SUGGESTION_CATEGORY_LABELS[cat]}</h3>
                    {items.length === 0 && <p className="empty">No suggestions in this group.</p>}
                    {items.map((s) => (
                      <article key={s.id} className={`suggestion decision-${s.decision}`} data-testid={`suggestion-${s.id}`}>
                        <div className="suggestion-head">
                          <strong>{s.id}</strong>
                          <Badge tone={DECISION_TONES[s.decision]}>{DECISION_LABELS[s.decision]}</Badge>
                        </div>
                        <p>{s.text}</p>
                        <p className="muted">Why: {s.rationale}</p>
                        {(s.effect.op === 'replace' || s.effect.op === 'add') && (
                          <p className="proposed">
                            <span className="label">
                              {s.effect.op === 'replace' ? `Proposed wording for ${s.effect.target_line_id}` : 'Proposed new line'}
                            </span>
                            {s.effect.new_text}
                          </p>
                        )}
                        <p className="links">
                          <span className="label">Links</span>
                          {s.record_ids.map((id) => (
                            <button
                              key={id}
                              type="button"
                              className="btn-link"
                              disabled={!knownRecords.has(id)}
                              title={knownRecords.has(id) ? `Open ${id} in the knowledge matrix` : `${id} is not in the current data`}
                              onClick={() => onOpenRecord(id)}
                            >
                              {id}
                            </button>
                          ))}
                          {s.dimension_ids.map((id) => (
                            <button
                              key={id}
                              type="button"
                              className="btn-link"
                              disabled={!knownDimensions.has(id)}
                              title={knownDimensions.has(id) ? `Show records for ${id}` : `${id} is not in the current template`}
                              onClick={() => onOpenDimensionRecords(id)}
                            >
                              {id}
                            </button>
                          ))}
                        </p>
                        <div className="button-row">
                          <button
                            type="button"
                            className="btn-small"
                            aria-pressed={s.decision === 'accepted'}
                            onClick={() => apply((st) => decideSuggestion(st, s.id, s.decision === 'accepted' ? 'pending' : 'accepted'))}
                          >
                            Accept change
                          </button>
                          <button
                            type="button"
                            className="btn-small"
                            aria-pressed={s.decision === 'rejected'}
                            onClick={() => apply((st) => decideSuggestion(st, s.id, s.decision === 'rejected' ? 'pending' : 'rejected'))}
                          >
                            Reject change
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Selected revision (reviewer-only preview)</h2>
        <p className="muted" data-testid="revision-meta">
          Working draft with {report.loaded ? accepted : 0} accepted change{accepted === 1 && report.loaded ? '' : 's'}{' '}
          applied. The original draft above is unchanged. Nothing is sent to a caregiver, and there is no publish step in
          this demo.
        </p>
        {revision.length === 0 ? (
          <p className="empty">The revision has no lines.</p>
        ) : (
          <ol className="draft readonly-draft" data-testid="selected-revision">
            {revision.map((line, i) => (
              <li key={`${i}-${line.text}`}>
                <Badge tone={ORIGIN_TONES[line.origin]}>
                  {REVISION_ORIGIN_LABELS[line.origin]}
                  {line.suggestion_id ? ` · ${line.suggestion_id}` : ''}
                </Badge>
                <span>{line.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="panel">
        <h2>Review scorecard</h2>
        <p className="muted">
          Rated by a person, one criterion at a time. Every criterion starts unrated. No average, total, or percentage is
          calculated.
        </p>
        <table className="grid plain-grid">
          <thead>
            <tr>
              <th scope="col">Criterion</th>
              <th scope="col" className="col-rating">Rating</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {example.scorecard.criteria.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.label}</th>
                <td className="col-rating">
                  <select
                    aria-label={`Rating for ${c.label}`}
                    value={c.rating ?? ''}
                    onChange={(e) => apply((s) => setScoreRating(s, c.id, e.target.value === '' ? null : e.target.value))}
                  >
                    <option value="">Not rated</option>
                    {c.scale.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <EditableText
                    label={`Note for ${c.label}`}
                    placeholder="Add a note"
                    value={c.note}
                    onCommit={(v) => apply((s) => setScoreNote(s, c.id, v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Critical-issue flags</h3>
        <p className="muted">Each flag is recorded separately. &ldquo;Not assessed&rdquo; is not the same as &ldquo;Not found&rdquo;.</p>
        <ul className="flag-list">
          {example.scorecard.critical_flags.map((f) => (
            <li key={f.id} className={f.status === 'issue_present' ? 'flag-on' : ''}>
              <label htmlFor={`flag-${f.id}`}>{f.label}</label>
              <select
                id={`flag-${f.id}`}
                value={f.status}
                onChange={(e) => apply((s) => setCriticalFlag(s, f.id, e.target.value as FlagStatus))}
              >
                {FLAG_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {FLAG_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <EditableText
          showLabel
          multiline
          label="Scorecard note"
          placeholder="Anything the ratings do not capture"
          value={example.scorecard.overall_note}
          onCommit={(v) => apply((s) => setScorecardNote(s, v))}
        />
      </div>

      <details className="panel" data-testid="prompt-preview">
        <summary>Prompt preview (text only)</summary>
        <p className="muted">
          Two provider-neutral prompt templates. They are text to copy and adapt. This prototype does not call any model,
          and no particular model has been tested with them.
        </p>
        {state.prompt_templates.map((p) => (
          <PromptEditor key={p.id} prompt={p} apply={apply} />
        ))}
      </details>
    </section>
  );
}
