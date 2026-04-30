import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';
import {
  CODE_HIGHLIGHT_LANGUAGE_KEYS,
  type CodeLanguageId,
} from './codeLanguageRegistry';

type HighlightRegistration = {
  id: CodeLanguageId;
  key: string | null;
};

type LanguageLoader = () => Promise<{ default: LanguageFn }>;

const highlightRegistrationCache = new Map<CodeLanguageId, Promise<HighlightRegistration>>();

const loaders: Record<Exclude<CodeLanguageId, 'plaintext'>, LanguageLoader> = {
  json: () => import('highlight.js/lib/languages/json'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  jsx: () => import('highlight.js/lib/languages/javascript'),
  tsx: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  html: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  sql: () => import('highlight.js/lib/languages/sql'),
  bash: () => import('highlight.js/lib/languages/bash'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  toml: () => import('highlight.js/lib/languages/ini'),
  rust: () => import('highlight.js/lib/languages/rust'),
  go: () => import('highlight.js/lib/languages/go'),
  swift: () => import('highlight.js/lib/languages/swift'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function loadCodeLanguageRegistration(language: CodeLanguageId): Promise<HighlightRegistration> {
  const cached = highlightRegistrationCache.get(language);
  if (cached) {
    return cached;
  }

  const promise: Promise<HighlightRegistration> = (async () => {
    if (language === 'plaintext') {
      return { id: language, key: null };
    }

    try {
      const module = await loaders[language]();
      const key = CODE_HIGHLIGHT_LANGUAGE_KEYS[language];
      if (!key) {
        return { id: language, key: null };
      }

      if (!hljs.getLanguage(key)) {
        hljs.registerLanguage(key, module.default);
      }

      return { id: language, key };
    } catch (error) {
      console.error(`Failed to load highlighter for ${language}`, error);
      highlightRegistrationCache.delete(language);
      return { id: language, key: null };
    }
  })();

  highlightRegistrationCache.set(language, promise);
  return promise;
}

export function highlightCodeToHtml(languageKey: string | null, value: string) {
  if (!value) {
    return '';
  }

  if (!languageKey || !hljs.getLanguage(languageKey)) {
    return escapeHtml(value);
  }

  return hljs.highlight(value, {
    language: languageKey,
    ignoreIllegals: true,
  }).value;
}
