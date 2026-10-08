import { useMemo, useState } from 'react';
import { Badge, nowIso, type ViewProps } from '../components/common';
import { EVIDENCE_TONES, REVIEW_TONES } from '../components/tones';
import {
  CONTENT_TYPE_LABELS,
  EVIDENCE_LABELS,
  INTENDED_USE_LABELS,
  PRIORITY_LABELS,
  REVIEW_STATE_LABELS,
} from '../labels';
import { addRecord } from '../state/actions';
import { effectiveContent, nextId } from '../state/selectors';
import { CONTENT_TYPES, EVIDENCE_STATES, INTENDED_USES, PRIORITIES, REVIEW_STATES } from '../types';
import { RecordDrawer } from './RecordDrawer';

interface Props extends ViewProps {
  dimensionFilter: string;
  onDimensionFilter: (dimensionId: string) => void;
  openRecordId: string | null;
  onOpenRecord: (recordId: string | null) => void;
}

const EMPTY_FILTERS = { search: '', type: '', use: '', priority: '', review: '', evidence: '' };

export function MatrixView({ state, apply, dimensionFilter, onDimensionFilter, openRecordId, onOpenRecord }: Props) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const dims = state.template.dimensions;
  const dimTitle = useMemo(() => new Map(dims.map((d) => [d.id, d.title])), [dims]);

  const rows = useMemo(() => {
    const order = new Map(dims.map((d, i) => [d.id, i]));
    const q = filters.search.trim().toLowerCase();
    return state.knowledge_records
      .filter((r) => {
        if (dimensionFilter && r.dimension_id !== dimensionFilter) return false;
        if (filters.type && r.content_type !== filters.type) return false;
        if (filters.use && !r.intended_use.some((u) => u === filters.use)) return false;
        if (filters.priority && r.proposed_priority !== filters.priority) return false;
        if (filters.review && r.review.state !== filters.review) return false;
        if (filters.evidence && r.evidence_state !== filters.evidence) return false;
        if (!q) return true;
        return [r.id, r.title, effectiveContent(r), r.dimension_id, dimTitle.get(r.dimension_id) ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (order.get(a.dimension_id) ?? 0) - (order.get(b.dimension_id) ?? 0) || a.id.localeCompare(b.id));
  }, [state.knowledge_records, dims, dimTitle, filters, dimensionFilter]);

  const filtersActive = dimensionFilter !== '' || Object.values(filters).some((v) => v !== '');
  const set = (key: keyof typeof EMPTY_FILTERS, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const clear = () => {
    setFilters(EMPTY_FILTERS);
    onDimensionFilter('');
  };
  const uncovered = dims.filter((d) => !state.knowledge_records.some((r) => r.dimension_id === d.id));

  const addNew = () => {
    const id = nextId(
      state.knowledge_records.map((r) => r.id),
      'COPD-R',
    );
    apply((s) => addRecord(s, dimensionFilter || dims[0].id, nowIso()));
    onOpenRecord(id);
  };

  return (
    <section aria-labelledby="matrix-title">
      <header className="view-head">
        <div>
          <h1 id="matrix-title">COPD knowledge matrix</h1>
          <p className="view-meta">
            {state.knowledge_records.length} candidate records · Clinical-use status: Not released
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={addNew}>
          Add candidate record
        </button>
      </header>

      <p className="callout">
        <strong>Synthetic discussion examples</strong>, not evidence-backed COPD recommendations. Each record holds one
        question, observation, precaution, or candidate action. Where clinical guidance would be needed, the record is a
        gap with a question for the clinician; nothing is filled in on the clinician&rsquo;s behalf.
      </p>

      <div className="filters" role="search" aria-label="Filter records">
        <div className="field grow">
          <label htmlFor="f-search">Search</label>
          <input
            id="f-search"
            type="search"
            placeholder="ID, title, content, or dimension"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f-dim">Dimension</label>
          <select id="f-dim" value={dimensionFilter} onChange={(e) => onDimensionFilter(e.target.value)}>
            <option value="">All</option>
            {dims.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-type">Type</label>
          <select id="f-type" value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">All</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-use">Used in</label>
          <select id="f-use" value={filters.use} onChange={(e) => set('use', e.target.value)}>
            <option value="">All</option>
            {INTENDED_USES.map((u) => (
              <option key={u} value={u}>
                {INTENDED_USE_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-priority">Priority</label>
          <select id="f-priority" value={filters.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">All</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-review">Review state</label>
          <select id="f-review" value={filters.review} onChange={(e) => set('review', e.target.value)}>
            <option value="">All</option>
            {REVIEW_STATES.map((r) => (
              <option key={r} value={r}>
                {REVIEW_STATE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-evidence">Evidence state</label>
          <select id="f-evidence" value={filters.evidence} onChange={(e) => set('evidence', e.target.value)}>
            <option value="">All</option>
            {EVIDENCE_STATES.map((ev) => (
              <option key={ev} value={ev}>
                {EVIDENCE_LABELS[ev]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!filtersActive}
          title={filtersActive ? undefined : 'No filters are set'}
          onClick={clear}
        >
          Clear filters
        </button>
      </div>

      <p className="muted" role="status" data-testid="matrix-count">
        Showing {rows.length} of {state.knowledge_records.length} records.
        {uncovered.length > 0 && <> Dimensions with no records yet: {uncovered.map((d) => d.id).join(', ')}.</>}
      </p>

      <table className="grid matrix-grid">
        <thead>
          <tr>
            <th scope="col" className="col-dim">Dimension</th>
            <th scope="col">Candidate content</th>
            <th scope="col" className="col-type">Type</th>
            <th scope="col" className="col-use">Used in</th>
            <th scope="col" className="col-priority">Priority</th>
            <th scope="col" className="col-review">Review state</th>
            <th scope="col" className="col-evidence">Evidence state</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="empty">
                {state.knowledge_records.length === 0
                  ? 'No candidate records yet. Use Add candidate record.'
                  : 'No records match these filters.'}{' '}
                {filtersActive && (
                  <button type="button" className="btn-link" onClick={clear}>
                    Clear filters
                  </button>
                )}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr
              key={r.id}
              className={`row-click${openRecordId === r.id ? ' row-open' : ''}`}
              data-testid={`record-row-${r.id}`}
              onClick={() => onOpenRecord(r.id)}
            >
              <td className="col-dim">
                <strong>{r.dimension_id}</strong>
                <span className="sub">{dimTitle.get(r.dimension_id) ?? 'Unknown dimension'}</span>
              </td>
              <td>
                <button
                  type="button"
                  className="row-title"
                  aria-label={`Open ${r.id}: ${r.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRecord(r.id);
                  }}
                >
                  <span className="rec-id">{r.id}</span> {r.title}
                </button>
                <span className="sub record-text">{effectiveContent(r)}</span>
                <span className="tag-row">
                  {r.needs_clinical_input && <Badge tone="coral">Needs clinical source/input</Badge>}
                  {r.edited_content !== null && <Badge tone="outline">Edited wording</Badge>}
                </span>
              </td>
              <td className="col-type">{CONTENT_TYPE_LABELS[r.content_type]}</td>
              <td className="col-use">
                {r.intended_use.length === 0 ? 'Not set' : r.intended_use.map((u) => INTENDED_USE_LABELS[u]).join(', ')}
              </td>
              <td className="col-priority">{PRIORITY_LABELS[r.proposed_priority]}</td>
              <td className="col-review">
                <Badge tone={REVIEW_TONES[r.review.state]}>{REVIEW_STATE_LABELS[r.review.state]}</Badge>
              </td>
              <td className="col-evidence">
                <Badge tone={EVIDENCE_TONES[r.evidence_state]}>{EVIDENCE_LABELS[r.evidence_state]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openRecordId && (
        <RecordDrawer state={state} apply={apply} recordId={openRecordId} onClose={() => onOpenRecord(null)} />
      )}
    </section>
  );
}
