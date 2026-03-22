import { Code, FilePenLine, FileText } from 'lucide-react';
import type { BlockKind } from './types';
export {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageLabel,
  highlightCodeToHtml,
  loadCodeLanguageRegistration,
  normalizeCodeLanguage,
  type CodeLanguageId,
} from './codeLanguageRegistry';

export const BLOCK_KIND_OPTIONS: Array<{
  kind: BlockKind;
  label: string;
  icon: typeof FilePenLine;
}> = [
  {
    kind: 'markdown',
    label: 'Markdown',
    icon: FilePenLine,
  },
  {
    kind: 'code',
    label: 'Code',
    icon: Code,
  },
  {
    kind: 'text',
    label: 'Plain Text',
    icon: FileText,
  },
];
