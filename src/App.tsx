import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog, downloadText, nowIso, type Apply } from './components/common';
import { DataControls, type DataControlsProps } from './components/DataControls';
import { DEMO_BANNER } from './labels';
import { exportJson, exportMarkdown, parseBundle } from './state/exporters';
import { createSeedState } from './state/seed';
import { workflowCounts } from './state/selectors';
import { loadState, saveState } from './state/storage';
import type { AppState } from './types';
import { CarePlanView } from './views/CarePlanView';
import { DecisionsView } from './views/DecisionsView';
import { MatrixView } from './views/MatrixView';
import { TemplateView } from './views/TemplateView';

const VIEWS = [
  { id: 'template', label: 'Disease template' },
  { id: 'matrix', label: 'COPD knowledge matrix' },
  { id: 'care-plan', label: 'Care-plan review example' },
  { id: 'decisions', label: 'Meeting decisions' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'];

const PROCESS_STEPS = ['Template', 'Candidate knowledge', 'Human review', 'Patient-context review', 'Caregiver workflow'];

function viewFromHash(): ViewId {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.find((v) => v.id === hash)?.id ?? 'template';
}

type Pending = { kind: 'reset' } | { kind: 'import'; state: AppState; filename: string };

export function App() {
  const [boot] = useState(() => loadState(window.localStorage));
  const [state, setState] = useState<AppState>(boot.state);
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [dimensionFilter, setDimensionFilter] = useState('');
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(boot.notice);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const apply: Apply = useCallback((fn) => setState((s) => fn(s)), []);

  useEffect(() => {
    const result = saveState(window.localStorage, state, nowIso());
    if (result.ok) {
      setSavedAt(new Date().toLocaleTimeString());
      setSaveError(null);
    } else {
      setSaveError(`Could not save locally: ${result.error}. Export JSON to keep this work.`);
    }
  }, [state]);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: ViewId) => {
    window.location.hash = `/${id}`;
    setView(id);
  };
  const openDimensionRecords = (dimensionId: string) => {
    setDimensionFilter(dimensionId);
    setOpenRecordId(null);
    go('matrix');
  };
  const openRecord = (recordId: string) => {
    setDimensionFilter('');
    setOpenRecordId(recordId);
    go('matrix');
  };

  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const dataControls: DataControlsProps = {
    onExportJson: () => {
      downloadText(`saha-knowledge-review-DEMO-${stamp()}.json`, exportJson(state, nowIso()), 'application/json');
      setNotice('JSON bundle exported. It is marked demo_only and not released.');
    },
    onExportMarkdown: () => {
      downloadText(`saha-knowledge-review-DEMO-${stamp()}.md`, exportMarkdown(state, nowIso()), 'text/markdown');
      setNotice('Markdown exported. It carries the draft/demo label.');
    },
    onImportFile: async (file) => {
      setNotice(null);
      const result = parseBundle(await file.text());
      if (!result.ok) {
        setImportErrors(result.errors);
        return;
      }
      setImportErrors(null);
      setPending({ kind: 'import', state: result.state, filename: file.name });
    },
    onReset: () => setPending({ kind: 'reset' }),
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.kind === 'reset') {
      setState(createSeedState());
      setNotice('Demo reset to the original fixtures.');
    } else {
      setState(pending.state);
      setNotice(`Imported "${pending.filename}". Local state was replaced.`);
    }
    setOpenRecordId(null);
    setDimensionFilter('');
    setImportErrors(null);
    setPending(null);
  };

  const counts = workflowCounts(state);

  return (
    <div className="app">
      <div className="banner" role="note">
        <strong>{DEMO_BANNER}</strong>
      </div>

      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <span className="brand-name">Saha</span>
          <span className="brand-sub">Knowledge Review Studio</span>
        </div>
        <ul className="nav-list">
          {VIEWS.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className={`nav-item${view === v.id ? ' active' : ''}`}
                aria-current={view === v.id ? 'page' : undefined}
                onClick={() => go(v.id)}
              >
                {v.label}
              </button>
            </li>
          ))}
        </ul>

        <section className="side-section" aria-labelledby="counts-title">
          <h2 id="counts-title">Workflow counts</h2>
          <dl className="counts" data-testid="workflow-counts">
            <div>
              <dt>Dimensions present</dt>
              <dd>{counts.dimensions_present}</dd>
            </div>
            <div>
              <dt>Records reviewed</dt>
              <dd>
                {counts.records_reviewed} / {counts.records_total}
              </dd>
            </div>
            <div>
              <dt>Needing evidence</dt>
              <dd>{counts.records_needing_evidence}</dd>
            </div>
            <div>
              <dt>Missing patient info</dt>
              <dd>{counts.records_missing_patient_information}</dd>
            </div>
            <div>
              <dt>Open decisions</dt>
              <dd>{counts.open_decisions}</dd>
            </div>
          </dl>
          <p className="side-note">Counts of local workflow state. Not clinical quality or validation scores.</p>
        </section>

        <section className="side-section" aria-labelledby="data-title">
          <h2 id="data-title">Local data</h2>
          <DataControls {...dataControls} />
          <p className="side-note" role="status" aria-live="polite" data-testid="save-status">
            {saveError ?? (savedAt ? `Saved in this browser · ${savedAt}` : 'Not saved yet')}
          </p>
          <p className="side-note">Synthetic meeting data only. Not a secure clinical record system.</p>
        </section>
      </nav>

      <div className="main">
        <ol className="process" aria-label="Process">
          {PROCESS_STEPS.map((step, i) => {
            const outside = i === PROCESS_STEPS.length - 1;
            return (
              <li key={step} className={outside ? 'outside' : ''}>
                <span>{step}</span>
                {outside && <em>Outside this demo</em>}
              </li>
            );
          })}
        </ol>

        <main className="content" id="content">
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button type="button" className="btn-quiet" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          )}
          {importErrors && (
            <div className="notice notice-error" role="alert" data-testid="import-error">
              <div>
                <strong>Import failed. Nothing was changed.</strong>
                <ul>
                  {importErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                <p>Choose a JSON bundle exported from this tool, or correct the fields listed above and try again.</p>
              </div>
              <button type="button" className="btn-quiet" onClick={() => setImportErrors(null)}>
                Dismiss
              </button>
            </div>
          )}

          {view === 'template' && <TemplateView state={state} apply={apply} onOpenDimensionRecords={openDimensionRecords} />}
          {view === 'matrix' && (
            <MatrixView
              state={state}
              apply={apply}
              dimensionFilter={dimensionFilter}
              onDimensionFilter={setDimensionFilter}
              openRecordId={openRecordId}
              onOpenRecord={setOpenRecordId}
            />
          )}
          {view === 'care-plan' && (
            <CarePlanView state={state} apply={apply} onOpenRecord={openRecord} onOpenDimensionRecords={openDimensionRecords} />
          )}
          {view === 'decisions' && <DecisionsView state={state} apply={apply} dataControls={dataControls} />}
        </main>
      </div>

      {pending?.kind === 'reset' && (
        <ConfirmDialog
          title="Reset the demo?"
          body={
            <p>
              This replaces everything saved in this browser (template edits, review decisions, references, the care-plan
              example, and meeting decisions) with the original fixtures. Export JSON first if you want to keep it.
            </p>
          }
          confirmLabel="Reset demo"
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
      {pending?.kind === 'import' && (
        <ConfirmDialog
          title="Replace local state with this import?"
          body={
            <p>
              &ldquo;{pending.filename}&rdquo; passed validation: {pending.state.template.dimensions.length} dimensions,{' '}
              {pending.state.knowledge_records.length} records. Importing replaces everything currently saved in this
              browser.
            </p>
          }
          confirmLabel="Import and replace"
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
