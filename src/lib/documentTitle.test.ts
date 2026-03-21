import { describe, expect, it } from 'vitest';
import { getEditableDocumentTitle, getVisibleDocumentTitle, isAutomaticDocumentTitle } from './documentTitle';

describe('document title helpers', () => {
  it('treats Untitled variants as automatic titles', () => {
    expect(isAutomaticDocumentTitle('Untitled')).toBe(true);
    expect(isAutomaticDocumentTitle('Untitled (1)')).toBe(true);
    expect(isAutomaticDocumentTitle('회의록')).toBe(false);
  });

  it('shows automatic titles as empty in the input', () => {
    expect(getEditableDocumentTitle('Untitled')).toBe('');
    expect(getEditableDocumentTitle('Untitled (3)')).toBe('');
    expect(getEditableDocumentTitle('회의록')).toBe('회의록');
  });

  it('keeps visible titles readable in document lists', () => {
    expect(getVisibleDocumentTitle(null)).toBe('Untitled');
    expect(getVisibleDocumentTitle('   ')).toBe('Untitled');
    expect(getVisibleDocumentTitle('회의록')).toBe('회의록');
  });
});
