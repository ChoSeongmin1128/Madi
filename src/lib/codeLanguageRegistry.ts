export const CODE_LANGUAGE_OPTIONS = [
  { id: 'plaintext', label: 'Plain Text', hidden: true },
  { id: 'json', label: 'JSON' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'jsx', label: 'JSX' },
  { id: 'tsx', label: 'TSX' },
  { id: 'python', label: 'Python' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'yaml', label: 'YAML' },
  { id: 'toml', label: 'TOML' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'swift', label: 'Swift' },
  { id: 'kotlin', label: 'Kotlin' },
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGE_OPTIONS)[number]['id'];

export const CODE_HIGHLIGHT_LANGUAGE_KEYS: Record<CodeLanguageId, string | null> = {
  plaintext: null,
  json: 'json',
  javascript: 'javascript',
  typescript: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  python: 'python',
  html: 'xml',
  css: 'css',
  sql: 'sql',
  bash: 'bash',
  markdown: 'markdown',
  yaml: 'yaml',
  toml: 'ini',
  rust: 'rust',
  go: 'go',
  swift: 'swift',
  kotlin: 'kotlin',
};

export function getCodeLanguageLabel(language: string | null) {
  return CODE_LANGUAGE_OPTIONS.find((option) => option.id === (language ?? 'plaintext'))?.label ?? 'Plain Text';
}

export function isSupportedCodeLanguage(language: string | null): language is CodeLanguageId {
  return CODE_LANGUAGE_OPTIONS.some((option) => option.id === language);
}

export function normalizeCodeLanguage(language: string | null): CodeLanguageId {
  return isSupportedCodeLanguage(language) ? language : 'plaintext';
}
