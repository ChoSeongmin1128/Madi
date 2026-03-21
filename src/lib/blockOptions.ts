import { FilePenLine, FileText } from 'lucide-react';
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
  description: string;
  icon: typeof FilePenLine;
}> = [
  {
    kind: 'markdown',
    label: 'Markdown',
    description: '구조적 문서 편집',
    icon: FilePenLine,
  },
  {
    kind: 'text',
    label: 'Text',
    description: '가벼운 plain text',
    icon: FileText,
  },
];
