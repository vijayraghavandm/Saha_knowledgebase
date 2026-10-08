import { useId, useState, type FormEvent } from 'react';
import { EditableText, formatTimestamp, nowIso, type Apply, type ViewProps } from '../components/common';
import { INCLUSION_LABELS } from '../labels';
import { addDimension, editDimensionText, moveDimension, setDimensionComment, setInclusion } from '../state/actions';
import { recordsForDimension } from '../state/selectors';
import { INCLUSION_DECISIONS, type Dimension, type InclusionDecision } from '../types';

interface Props extends ViewProps {
  onOpenDimensionRecords: (dimensionId: string) => void;
}

function InclusionCell({ dimension, apply }: { dimension: Dimension; apply: Apply }) {
  // Not applicable is only stored once a reason has been given.
  const [pendingReason, setPendingReason] = useState<string | null>(null);
  const reasonId = useId();
  const choosing = pendingReason !== null;

  const onSelect = (decision: InclusionDecision) => {
    if (decision === 'not_applicable') {
      setPendingReason(dimension.not_applicable_reason);
    } else {
      setPendingReason(null);
      apply((s) => setInclusion(s, dimension.id, decision));
    }
  };

  return (
    <div className="inclusion">
      <select
        aria-label={`Inclusion decision for ${dimension.id}`}
        className={`decision decision-${choosing ? 'not_applicable' : dimension.inclusion_decision}`}
        value={choosing ? 'not_applicable' : dimension.inclusion_decision}
        onChange={(e) => onSelect(e.target.value as InclusionDecision)}
      >
        {INCLUSION_DECISIONS.map((d) => (
          <option key={d} value={d}>
            {INCLUSION_LABELS[d]}
          </option>
        ))}
      </select>

      {choosing && (
        <div className="reason-box">
          <label htmlFor={reasonId}>Reason (required)</label>
          <textarea
            id={reasonId}
            rows={2}
            value={pendingReason}
            aria-invalid={pendingReason.trim() === ''}
            onChange={(e) => setPendingReason(e.target.value)}
          />
          {pendingReason.trim() === '' && (
            <p className="field-error">Not applicable is not saved until a reason is entered.</p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="btn-primary btn-small"
              disabled={pendingReason.trim() === ''}
              onClick={() => {
                apply((s) => setInclusion(s, dimension.id, 'not_applicable', pendingReason));
                setPendingReason(null);
              }}
            >
              Save as Not applicable
            </button>
            <button type="button" className="btn-small" onClick={() => setPendingReason(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!choosing && dimension.inclusion_decision === 'not_applicable' && (
        <p className="reason-text">
          <strong>Reason:</strong> {dimension.not_applicable_reason}{' '}
          <button type="button" className="btn-link" onClick={() => setPendingReason(dimension.not_applicable_reason)}>
            Edit reason
          </button>
        </p>
      )}
    </div>
  );
}

export function TemplateView({ state, apply, onOpenDimensionRecords }: Props) {
  const template = state.template;
  const dims = template.dimensions;
  const [draft, setDraft] = useState({ title: '', purpose_question: '', example_question: '' });
  const [addError, setAddError] = useState<string | null>(null);

  const submitNew = (e: FormEvent) => {
    e.preventDefault();
    if (draft.title.trim() === '') {
      setAddError('Enter a title for the new dimension.');
      return;
    }
    apply((s) => addDimension(s, draft, nowIso()));
    setDraft({ title: '', purpose_question: '', example_question: '' });
    setAddError(null);
  };

  return (
    <section aria-labelledby="template-title">
      <header className="view-head">
        <div>
          <h1 id="template-title">Disease template</h1>
          <p className="view-meta" data-testid="template-meta">
            {template.condition_example} worked example · Template v{template.template_version} · {dims.length} dimensions ·
            Proposed for discussion, not clinically validated
          </p>
        </div>
      </header>

      <p className="callout">
        <strong>These are knowledge-coverage dimensions, not 20 mandatory daily caregiver tasks.</strong>
      </p>
      <p className="muted">
        The exact dimensions are proposed design choices, not an approved clinical framework. Edit wording, reorder, or add
        a dimension; IDs stay fixed and the template version increases with each of those changes. Edits save when you
        leave a field. Evidence and review states are kept with the knowledge records, not in this table: use the Records
        link on each row.
      </p>

      <table className="grid template-grid">
        <thead>
          <tr>
            <th scope="col" className="col-order">Order</th>
            <th scope="col" className="col-id">ID</th>
            <th scope="col">Title</th>
            <th scope="col">Purpose</th>
            <th scope="col">Example question</th>
            <th scope="col" className="col-decision">Inclusion decision</th>
            <th scope="col">Reviewer comment</th>
            <th scope="col" className="col-records">Records</th>
          </tr>
        </thead>
        <tbody>
          {dims.map((d, i) => {
            const count = recordsForDimension(state, d.id).length;
            return (
              <tr key={d.id} data-testid={`dimension-${d.id}`}>
                <td className="col-order">
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Move ${d.id} up`}
                    disabled={i === 0}
                    title={i === 0 ? 'Already first' : 'Move up'}
                    onClick={() => apply((s) => moveDimension(s, d.id, -1, nowIso()))}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Move ${d.id} down`}
                    disabled={i === dims.length - 1}
                    title={i === dims.length - 1 ? 'Already last' : 'Move down'}
                    onClick={() => apply((s) => moveDimension(s, d.id, 1, nowIso()))}
                  >
                    ▼
                  </button>
                </td>
                <td className="col-id">{d.id}</td>
                <td>
                  <EditableText
                    multiline
                    label={`Title for ${d.id}`}
                    value={d.title}
                    onCommit={(v) => {
                      if (v.trim() === '') return false;
                      apply((s) => editDimensionText(s, d.id, 'title', v, nowIso()));
                    }}
                  />
                </td>
                <td>
                  <EditableText
                    multiline
                    label={`Purpose question for ${d.id}`}
                    value={d.purpose_question}
                    onCommit={(v) => apply((s) => editDimensionText(s, d.id, 'purpose_question', v, nowIso()))}
                  />
                </td>
                <td>
                  <EditableText
                    multiline
                    label={`Example question for ${d.id}`}
                    value={d.example_question}
                    placeholder="No example question yet"
                    onCommit={(v) => apply((s) => editDimensionText(s, d.id, 'example_question', v, nowIso()))}
                  />
                </td>
                <td className="col-decision">
                  <InclusionCell dimension={d} apply={apply} />
                </td>
                <td>
                  <EditableText
                    multiline
                    label={`Reviewer comment for ${d.id}`}
                    value={d.reviewer_comment}
                    placeholder="Add a comment"
                    onCommit={(v) => apply((s) => setDimensionComment(s, d.id, v))}
                  />
                </td>
                <td className="col-records">
                  <button type="button" className="btn-link" onClick={() => onOpenDimensionRecords(d.id)}>
                    {count === 0 ? 'No records' : `${count} record${count === 1 ? '' : 's'}`}
                    <span className="visually-hidden"> for {d.id} in the knowledge matrix</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <form className="panel add-form" onSubmit={submitNew} aria-labelledby="add-dimension-title">
        <h2 id="add-dimension-title">Add a dimension</h2>
        <p className="muted">A new dimension gets the next unused ID and starts as To discuss.</p>
        <div className="form-grid three">
          <div className="field">
            <label htmlFor="new-dim-title">Title</label>
            <input
              id="new-dim-title"
              type="text"
              value={draft.title}
              aria-invalid={addError !== null}
              aria-describedby={addError ? 'new-dim-error' : undefined}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            {addError && (
              <p className="field-error" id="new-dim-error">
                {addError}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="new-dim-purpose">Purpose question</label>
            <input
              id="new-dim-purpose"
              type="text"
              value={draft.purpose_question}
              onChange={(e) => setDraft({ ...draft, purpose_question: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="new-dim-example">Example question</label>
            <input
              id="new-dim-example"
              type="text"
              value={draft.example_question}
              onChange={(e) => setDraft({ ...draft, example_question: e.target.value })}
            />
          </div>
        </div>
        <div className="button-row">
          <button type="submit" className="btn-primary">
            Add dimension
          </button>
        </div>
      </form>

      <details className="panel">
        <summary>Template change log ({template.change_log.length})</summary>
        {template.change_log.length === 0 ? (
          <p className="empty">No substantive edits yet. The template is at v{template.template_version}.</p>
        ) : (
          <ul className="log">
            {[...template.change_log].reverse().map((c) => (
              <li key={c.version}>
                <strong>v{c.version}</strong> · {c.summary} · <span className="muted">{formatTimestamp(c.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Design basis: {template.design_basis.source}; {template.design_basis.passage}. {template.design_basis.note}
        </p>
      </details>
    </section>
  );
}
