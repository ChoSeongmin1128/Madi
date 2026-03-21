import { describe, expect, it } from 'vitest';
import { detectMarkdownListShortcut, shouldReplaceMarkdownArrow } from './markdownEditorBehavior';

describe('markdown editor behavior helpers', () => {
  it('detects supported list shortcuts', () => {
    expect(detectMarkdownListShortcut('-')).toEqual({ kind: 'bullet' });
    expect(detectMarkdownListShortcut('*')).toEqual({ kind: 'bullet' });
    expect(detectMarkdownListShortcut('[]')).toEqual({ kind: 'task' });
    expect(detectMarkdownListShortcut('[ ]')).toEqual({ kind: 'task' });
    expect(detectMarkdownListShortcut('3.')).toEqual({ kind: 'ordered', start: 3 });
  });

  it('does not detect unrelated shortcuts', () => {
    expect(detectMarkdownListShortcut('->')).toBeNull();
    expect(detectMarkdownListShortcut('hello')).toBeNull();
  });

  it('only replaces markdown arrows after a hyphen', () => {
    expect(shouldReplaceMarkdownArrow('-')).toBe(true);
    expect(shouldReplaceMarkdownArrow('test-')).toBe(true);
    expect(shouldReplaceMarkdownArrow('test')).toBe(false);
    expect(shouldReplaceMarkdownArrow('')).toBe(false);
  });
});
