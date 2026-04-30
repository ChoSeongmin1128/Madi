import { describe, expect, it } from 'vitest';
import { isBlockClipboardText, parseBlockClipboardText } from './clipboardService';

describe('clipboardService', () => {
  it('detects and parses Madi block clipboard metadata', () => {
    const text = '<!--madi-block:[{"kind":"markdown","content":"# Hello","language":null}]-->\n# Hello';

    expect(isBlockClipboardText(text)).toBe(true);
    expect(parseBlockClipboardText(text)).toEqual([
      { kind: 'markdown', content: '# Hello', language: null },
    ]);
  });

  it('does not treat plain text as Madi block clipboard data', () => {
    const text = 'just plain text';

    expect(isBlockClipboardText(text)).toBe(false);
    expect(parseBlockClipboardText(text)).toBeNull();
  });
});
