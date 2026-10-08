import { useRef } from 'react';

export interface DataControlsProps {
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onImportFile: (file: File) => void;
  onReset: () => void;
}

export function DataControls({ onExportJson, onExportMarkdown, onImportFile, onReset }: DataControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="data-controls">
      <button type="button" onClick={onExportJson}>
        Export JSON
      </button>
      <button type="button" onClick={onExportMarkdown}>
        Export Markdown
      </button>
      <button type="button" onClick={() => fileRef.current?.click()}>
        Import JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Choose a JSON bundle to import"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportFile(file);
          e.target.value = '';
        }}
      />
      <button type="button" onClick={onReset}>
        Reset demo
      </button>
    </div>
  );
}
