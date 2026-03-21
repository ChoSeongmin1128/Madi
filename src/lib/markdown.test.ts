import { describe, expect, it } from 'vitest';
import {
  extractTextFromMarkdownJson,
  isMarkdownJsonEmpty,
  looksLikeMarkdown,
  serializeBlockToMarkdown,
  serializeDocumentToMarkdown,
  serializeMarkdownBlockToMarkdown,
} from './markdown';

describe('markdown utilities', () => {
  it('extracts plain text from tiptap json', () => {
    const text = extractTextFromMarkdownJson({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '제목' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '본문 내용' }],
        },
      ],
    });

    expect(text).toContain('제목');
    expect(text).toContain('본문 내용');
  });

  it('recognizes empty markdown json', () => {
    expect(
      isMarkdownJsonEmpty({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
    ).toBe(true);
  });

  it('detects markdown-looking clipboard text', () => {
    expect(looksLikeMarkdown('# 헤딩\n- 항목')).toBe(true);
    expect(looksLikeMarkdown('평문입니다.')).toBe(false);
  });

  it('serializes tiptap markdown json into markdown text', () => {
    const markdown = serializeMarkdownBlockToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '제목' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: '항목' }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(markdown).toBe('## 제목\n\n- 항목');
  });

  it('serializes document blocks into markdown document', () => {
    const markdown = serializeDocumentToMarkdown([
      {
        kind: 'markdown',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '본문' }],
            },
          ],
        },
      },
      {
        kind: 'code',
        content: 'const a = 1;',
        language: 'typescript',
      },
      {
        kind: 'text',
        content: '메모',
      },
    ]);

    expect(markdown).toBe('본문\n\n```typescript\nconst a = 1;\n```\n\n메모');
    expect(
      serializeBlockToMarkdown({
        kind: 'code',
        content: 'hello',
        language: 'plaintext',
      }),
    ).toBe('```\nhello\n```');
  });
});
