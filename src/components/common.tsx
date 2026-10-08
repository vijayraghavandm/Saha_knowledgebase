import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { AppState } from '../types';

export type Apply = (fn: (state: AppState) => AppState) => void;

export interface ViewProps {
  state: AppState;
  apply: Apply;
}

export const nowIso = () => new Date().toISOString();

export function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

interface EditableTextProps {
  value: string;
  /** Called when the field loses focus with a changed value. Return false to refuse the edit. */
  onCommit: (value: string) => boolean | void;
  label: string;
  /** Show the label above the field. Otherwise it is used as the accessible name only. */
  showLabel?: boolean;
  multiline?: boolean;
  placeholder?: string;
  type?: 'text' | 'date';
  testId?: string;
}

/** Text field that saves when focus leaves it, so each edit is one change. */
export function EditableText({ value, onCommit, label, showLabel, multiline, placeholder, type = 'text', testId }: EditableTextProps) {
  const [draft, setDraft] = useState(value);
  const id = useId();
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft === value) return;
    if (onCommit(draft) === false) setDraft(value);
  };
  const shared = {
    id,
    value: draft,
    placeholder,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    'aria-label': showLabel ? undefined : label,
    'data-testid': testId,
  };
  return (
    <div className="field">
      {showLabel && <label htmlFor={id}>{label}</label>}
      {multiline ? <textarea rows={2} {...shared} /> : <input type={type} {...shared} />}
    </div>
  );
}

export type Tone = 'neutral' | 'sage' | 'amber' | 'coral' | 'teal' | 'outline';

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  );
}

interface ConfirmDialogProps {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        <div className="dialog-body">{body}</div>
        <div className="button-row end">
          <button type="button" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
