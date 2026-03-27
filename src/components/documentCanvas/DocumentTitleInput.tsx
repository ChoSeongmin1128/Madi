import { useState, type KeyboardEvent } from 'react';
import { useDocumentController } from '../../app/controllers';
import { getEditableDocumentTitle } from '../../lib/documentTitle';

interface DocumentTitleInputProps {
  title: string | null;
}

export function DocumentTitleInput({ title }: DocumentTitleInputProps) {
  const { commitDocumentTitle } = useDocumentController();
  const [draft, setDraft] = useState(getEditableDocumentTitle(title));

  return (
    <input
      className="document-title-input"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void commitDocumentTitle(draft)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void commitDocumentTitle(draft);
          event.currentTarget.blur();
        }
      }}
      placeholder="Untitled"
    />
  );
}
