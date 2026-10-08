import { useState, type FormEvent } from 'react';
import { EditableText, type ViewProps } from '../components/common';
import { DataControls, type DataControlsProps } from '../components/DataControls';
import { DECISION_STATUS_LABELS } from '../labels';
import { addDecision, setMeetingNotes, updateDecision } from '../state/actions';
import { workflowCounts } from '../state/selectors';
import { DECISION_STATUSES, type DecisionStatus } from '../types';

interface Props extends ViewProps {
  dataControls: DataControlsProps;
}

export function DecisionsView({ state, apply, dataControls }: Props) {
  const counts = workflowCounts(state);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim() === '') {
      setError('Enter the question to be decided.');
      return;
    }
    apply((s) => addDecision(s, question));
    setQuestion('');
    setError(null);
  };

  return (
    <section aria-labelledby="decisions-title">
      <header className="view-head">
        <div>
          <h1 id="decisions-title">Meeting decisions</h1>
          <p className="view-meta">
            {counts.open_decisions} open · {state.meeting_decisions.length - counts.open_decisions} resolved
          </p>
        </div>
      </header>

      <div className="panel">
        <h2>Workflow counts</h2>
        <p className="muted">Derived from the current local state. These are workflow counts, not clinical quality or validation scores.</p>
        <dl className="count-tiles">
          <div>
            <dt>Dimensions present</dt>
            <dd>{counts.dimensions_present}</dd>
          </div>
          <div>
            <dt>Records reviewed</dt>
            <dd>
              {counts.records_reviewed} <span>of {counts.records_total}</span>
            </dd>
          </div>
          <div>
            <dt>Records needing evidence</dt>
            <dd>{counts.records_needing_evidence}</dd>
          </div>
          <div>
            <dt>Missing patient information</dt>
            <dd>{counts.records_missing_patient_information}</dd>
          </div>
          <div>
            <dt>Open decisions</dt>
            <dd>{counts.open_decisions}</dd>
          </div>
        </dl>
      </div>

      <p className="muted">Owners and due dates stay unassigned until someone enters them. Edits save when you leave a field.</p>
      <table className="grid decisions-grid">
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Decision</th>
            <th scope="col" className="col-owner">Owner</th>
            <th scope="col">Next action</th>
            <th scope="col" className="col-date">Due date</th>
            <th scope="col" className="col-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {state.meeting_decisions.map((d) => (
            <tr key={d.id} data-testid={`decision-${d.id}`}>
              <th scope="row">
                <span className="rec-id">{d.id}</span> {d.question}
              </th>
              <td>
                <EditableText
                  multiline
                  label={`Decision for ${d.id}`}
                  placeholder="No decision recorded"
                  value={d.decision}
                  onCommit={(v) => apply((s) => updateDecision(s, d.id, { decision: v }))}
                />
              </td>
              <td className="col-owner">
                <EditableText
                  label={`Owner for ${d.id}`}
                  placeholder="Unassigned"
                  value={d.owner}
                  onCommit={(v) => apply((s) => updateDecision(s, d.id, { owner: v }))}
                />
              </td>
              <td>
                <EditableText
                  multiline
                  label={`Next action for ${d.id}`}
                  placeholder="None recorded"
                  value={d.next_action}
                  onCommit={(v) => apply((s) => updateDecision(s, d.id, { next_action: v }))}
                />
              </td>
              <td className="col-date">
                <EditableText
                  type="date"
                  label={`Due date for ${d.id}`}
                  value={d.due_date}
                  onCommit={(v) => apply((s) => updateDecision(s, d.id, { due_date: v }))}
                />
              </td>
              <td className="col-status">
                <select
                  aria-label={`Status for ${d.id}`}
                  className={`decision decision-${d.status}`}
                  value={d.status}
                  onChange={(e) => apply((s) => updateDecision(s, d.id, { status: e.target.value as DecisionStatus }))}
                >
                  {DECISION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {DECISION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="panel add-form" onSubmit={submit}>
        <h2>Add a decision row</h2>
        <div className="inline-add">
          <div className="field grow">
            <label htmlFor="new-decision">Question to decide</label>
            <input
              id="new-decision"
              type="text"
              value={question}
              aria-invalid={error !== null}
              aria-describedby={error ? 'new-decision-error' : undefined}
              onChange={(e) => setQuestion(e.target.value)}
            />
            {error && (
              <p className="field-error" id="new-decision-error">
                {error}
              </p>
            )}
          </div>
          <button type="submit" className="btn-primary">
            Add row
          </button>
        </div>
      </form>

      <div className="panel">
        <h2>Meeting notes</h2>
        <EditableText
          multiline
          label="Meeting notes"
          placeholder="Free-text notes from the meeting. Do not enter real patient details."
          value={state.meeting_notes}
          testId="meeting-notes"
          onCommit={(v) => apply((s) => setMeetingNotes(s, v))}
        />
      </div>

      <div className="panel">
        <h2>Export, import, and reset</h2>
        <p className="muted">
          Export JSON writes one versioned bundle: template, knowledge records, source records, reviewer decisions, the
          original and revised demo plan, scorecard, prompt templates, and meeting decisions. Export Markdown writes the
          same information in readable form. Both are labelled draft/demo.
        </p>
        <DataControls {...dataControls} />
        <p className="muted">
          Everything is kept in this browser&rsquo;s local storage, on this device only. That is suitable for synthetic
          meeting data. It is not a secure clinical record system: do not enter real patient or family details. Import
          validates the file first and leaves current data untouched if the file is rejected. Reset asks for confirmation.
        </p>
      </div>
    </section>
  );
}
