import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { BlockKind, JsonValue } from './types';

export function createEmptyMarkdownContent() {
  return '';
}

export function normalizeMarkdownContent(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

export function isMarkdownContentEmpty(value: JsonValue | string) {
  const text = extractTextFromMarkdownContent(value).trim();
  return text.length === 0;
}

export function extractTextFromMarkdownContent(value: JsonValue | string): string {
  if (typeof value === 'string') {
    return markdownToPlainText(value);
  }

  if (Array.isArray(value)) {
    return value.map(extractTextFromMarkdownContent).join(' ').trim();
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    const textValue = entries
      .flatMap(([key, child]) => {
        if (key === 'text' && typeof child === 'string') {
          return [child];
        }

        if (key === 'type') {
          return [];
        }

        return [extractTextFromMarkdownContent(child)];
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return textValue;
  }

  return '';
}

export const extractTextFromMarkdownJson = extractTextFromMarkdownContent;

export function looksLikeMarkdown(text: string) {
  const trimmed = text.trim();
  return /^(#{1,6}\s|-\s|\*\s|\d+\.\s|>\s|```|\[.\]\s)/m.test(trimmed);
}

export function markdownToHtml(markdown: string) {
  return DOMPurify.sanitize(marked.parse(markdown) as string);
}

export function markdownToPlainText(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, '\n');

  return normalized
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('```')) {
        return '';
      }

      const withoutMarker = trimmed
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s+/, '')
        .replace(/^[-*]\s+\[(?: |x|X)\]\s+/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+\.\s+/, '');

      return withoutMarker
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_~`>#-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    })
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getBlockPlainText(kind: 'markdown' | 'code' | 'text', content: JsonValue | string) {
  if (kind === 'markdown') {
    return extractTextFromMarkdownContent(content);
  }

  return typeof content === 'string' ? content : '';
}

function normalizeStructuredLines(lines: string[]) {
  return lines
    .map((line) => line.replace(/[ \t]+\n/g, '\n').replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractStructuredLinesFromMarkdownJson(value: JsonValue | string): string[] {
  if (typeof value === 'string') {
    return value.split('\n');
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractStructuredLinesFromMarkdownJson);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const nodeType = typeof value.type === 'string' ? value.type : null;
  const content = Array.isArray(value.content) ? value.content : null;

  if (nodeType === 'text') {
    return typeof value.text === 'string' ? [value.text] : [];
  }

  if (nodeType === 'hardBreak') {
    return ['\n'];
  }

  if (nodeType === 'doc') {
    return content ? content.flatMap(extractStructuredLinesFromMarkdownJson) : [];
  }

  if (nodeType === 'listItem' || nodeType === 'taskItem') {
    const body = content ? normalizeStructuredLines(content.flatMap(extractStructuredLinesFromMarkdownJson)) : '';
    return body ? [body, '\n'] : ['\n'];
  }

  if (nodeType === 'bulletList' || nodeType === 'orderedList' || nodeType === 'taskList') {
    return content ? [...content.flatMap(extractStructuredLinesFromMarkdownJson), '\n'] : ['\n'];
  }

  if (
    nodeType === 'paragraph' ||
    nodeType === 'heading' ||
    nodeType === 'blockquote' ||
    nodeType === 'codeBlock'
  ) {
    const body = content ? normalizeStructuredLines(content.flatMap(extractStructuredLinesFromMarkdownJson)) : '';
    return body ? [body, '\n'] : ['\n'];
  }

  if (content) {
    return content.flatMap(extractStructuredLinesFromMarkdownJson);
  }

  return [];
}

export function getBlockPreviewText(kind: 'markdown' | 'code' | 'text', content: JsonValue | string) {
  if (kind === 'markdown') {
    if (typeof content === 'string') {
      return content.trimEnd();
    }

    return normalizeStructuredLines(extractStructuredLinesFromMarkdownJson(content));
  }

  return typeof content === 'string' ? content.trimEnd() : '';
}

type InlineMark = {
  type?: string;
};

type MarkdownBlockLike = {
  kind: BlockKind;
  content: JsonValue | string;
  language?: string | null;
};

function getNodeAttrs(node: Record<string, JsonValue>) {
  const attrs = node.attrs;
  return attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? attrs : null;
}

function serializeInlineNode(node: JsonValue | string): string {
  if (typeof node === 'string') {
    return node;
  }

  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return '';
  }

  const nodeType = typeof node.type === 'string' ? node.type : null;

  if (nodeType === 'text') {
    let text = typeof node.text === 'string' ? node.text : '';
    const marks = Array.isArray(node.marks) ? (node.marks as InlineMark[]) : [];

    for (const mark of marks) {
      if (mark.type === 'bold') {
        text = `**${text}**`;
      } else if (mark.type === 'italic') {
        text = `*${text}*`;
      } else if (mark.type === 'strike') {
        text = `~~${text}~~`;
      } else if (mark.type === 'code') {
        text = `\`${text}\``;
      }
    }

    return text;
  }

  if (nodeType === 'hardBreak') {
    return '  \n';
  }

  const content = Array.isArray(node.content) ? node.content : [];
  return content.map(serializeInlineNode).join('');
}

function indentLines(text: string, indent: string) {
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? `${indent}${line}` : indent.trimEnd()))
    .join('\n');
}

function serializeListItemNode(node: Record<string, JsonValue>, prefix: string, indent: string): string {
  const nestedIndent = `${indent}  `;
  const content = Array.isArray(node.content) ? node.content : [];
  const parts = content
    .map((child, index) => serializeMarkdownNode(child, index === 0 ? '' : nestedIndent))
    .filter((part) => part.trim().length > 0);

  if (parts.length === 0) {
    return `${indent}${prefix}`.trimEnd();
  }

  const [firstPart, ...rest] = parts;
  const firstLines = firstPart.split('\n');
  const head = `${indent}${prefix}${firstLines[0] ?? ''}`;
  const tail = firstLines.slice(1).map((line) => `${nestedIndent}${line}`);

  return [head, ...tail, ...rest].join('\n');
}

function serializeMarkdownNode(node: JsonValue | string, indent = ''): string {
  if (typeof node === 'string') {
    return node;
  }

  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return '';
  }

  const nodeType = typeof node.type === 'string' ? node.type : null;
  const content = Array.isArray(node.content) ? node.content : [];

  switch (nodeType) {
    case 'doc':
      return content
        .map((child) => serializeMarkdownNode(child, indent))
        .filter((part) => part.trim().length > 0)
        .join('\n\n')
        .trim();
    case 'paragraph':
      return `${indent}${content.map(serializeInlineNode).join('')}`.trimEnd();
    case 'heading': {
      const attrs = getNodeAttrs(node);
      const level = attrs && typeof attrs.level === 'number'
        ? Math.min(Math.max(attrs.level, 1), 6)
        : 1;
      return `${indent}${'#'.repeat(level)} ${content.map(serializeInlineNode).join('')}`.trimEnd();
    }
    case 'bulletList':
      return content
        .map((child) => serializeListItemNode(child as Record<string, JsonValue>, '- ', indent))
        .join('\n');
    case 'orderedList': {
      const attrs = getNodeAttrs(node);
      const start = attrs && typeof attrs.start === 'number' ? attrs.start : 1;
      return content
        .map((child, index) =>
          serializeListItemNode(child as Record<string, JsonValue>, `${start + index}. `, indent),
        )
        .join('\n');
    }
    case 'taskList':
      return content
        .map((child) => {
          const childObject =
            typeof child === 'object' && child && !Array.isArray(child)
              ? (child as Record<string, JsonValue>)
              : null;
          const attrs = childObject ? getNodeAttrs(childObject) : null;
          const checked =
            attrs?.checked === true;
          return serializeListItemNode(
            child as Record<string, JsonValue>,
            checked ? '- [x] ' : '- [ ] ',
            indent,
          );
        })
        .join('\n');
    case 'listItem':
    case 'taskItem':
      return serializeListItemNode(node as Record<string, JsonValue>, '- ', indent);
    case 'blockquote': {
      const quoted = content
        .map((child) => serializeMarkdownNode(child, ''))
        .filter((part) => part.trim().length > 0)
        .join('\n\n');
      return indentLines(quoted, `${indent}> `);
    }
    case 'codeBlock': {
      const attrs = getNodeAttrs(node);
      const language = attrs && typeof attrs.language === 'string' ? attrs.language : '';
      const body = content.map(serializeInlineNode).join('').replace(/\n+$/g, '');
      return `${indent}\`\`\`${language}\n${body}\n${indent}\`\`\``;
    }
    case 'horizontalRule':
      return `${indent}---`;
    default:
      return content
        .map((child) => serializeMarkdownNode(child, indent))
        .filter((part) => part.trim().length > 0)
        .join('\n\n');
  }
}

export function serializeMarkdownBlockToMarkdown(content: JsonValue | string) {
  if (typeof content === 'string') {
    return normalizeMarkdownContent(content);
  }

  return serializeMarkdownNode(content).trim();
}

export const isMarkdownJsonEmpty = isMarkdownContentEmpty;

export function serializeBlockToMarkdown(block: MarkdownBlockLike) {
  if (block.kind === 'markdown') {
    return serializeMarkdownBlockToMarkdown(block.content);
  }

  if (block.kind === 'code') {
    const body = (typeof block.content === 'string' ? block.content : '').replace(/\n+$/g, '');
    const language = block.language && block.language !== 'plaintext' ? block.language : '';
    return `\`\`\`${language}\n${body}\n\`\`\``.trim();
  }

  return typeof block.content === 'string' ? block.content.trimEnd() : '';
}

export function serializeDocumentToMarkdown(blocks: MarkdownBlockLike[]) {
  return blocks
    .map(serializeBlockToMarkdown)
    .filter((block) => block.trim().length > 0)
    .join('\n\n')
    .trim();
}
