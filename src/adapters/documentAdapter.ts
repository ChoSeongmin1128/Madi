import { normalizeCodeLanguage, type CodeLanguageId } from '../lib/codeLanguageRegistry';
import { getBlockPlainText } from '../lib/markdown';
import type {
  BlockDto,
  BlockKind,
  BlockTintPreset,
  DocumentDto,
  DocumentSummaryDto,
  SearchResultDto,
} from '../lib/types';

interface BlockVmBase {
  id: string;
  documentId: string;
  kind: BlockKind;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarkdownBlockVm extends BlockVmBase {
  kind: 'markdown';
  content: string;
  language: null;
}

export interface CodeBlockVm extends BlockVmBase {
  kind: 'code';
  content: string;
  language: CodeLanguageId;
}

export interface TextBlockVm extends BlockVmBase {
  kind: 'text';
  content: string;
  language: null;
}

export type BlockVm = MarkdownBlockVm | CodeBlockVm | TextBlockVm;

export interface DocumentSummaryVm {
  id: string;
  title: string | null;
  blockTintOverride: BlockTintPreset | null;
  preview: string;
  updatedAt: number;
  lastOpenedAt: number;
  blockCount: number;
}

export interface DocumentVm extends DocumentSummaryVm {
  blocks: BlockVm[];
}

export interface SearchResultVm extends DocumentSummaryVm {
  score: number;
}

export function toBlockVm(block: BlockDto): BlockVm {
  const base = {
    id: block.id,
    documentId: block.documentId,
    kind: block.kind,
    position: block.position,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  } satisfies BlockVmBase;

  if (block.kind === 'markdown') {
    return {
      ...base,
      kind: 'markdown',
      content: block.content,
      language: null,
    };
  }

  if (block.kind === 'code') {
    return {
      ...base,
      kind: 'code',
      content: typeof block.content === 'string' ? block.content : '',
      language: normalizeCodeLanguage(block.language),
    };
  }

  return {
    ...base,
    kind: 'text',
    content: typeof block.content === 'string' ? block.content : '',
    language: null,
  };
}

export function toDocumentSummaryVm(document: DocumentSummaryDto): DocumentSummaryVm {
  return {
    id: document.id,
    title: document.title,
    blockTintOverride: document.blockTintOverride,
    preview: document.preview,
    updatedAt: document.updatedAt,
    lastOpenedAt: document.lastOpenedAt,
    blockCount: document.blockCount,
  };
}

export function toDocumentVm(document: DocumentDto): DocumentVm {
  const blocks = document.blocks
    .map(toBlockVm)
    .sort((left, right) => left.position - right.position);

  return {
    ...toDocumentSummaryVm(document),
    blocks,
  };
}

export function toSearchResultVm(result: SearchResultDto): SearchResultVm {
  return {
    ...toDocumentSummaryVm(result),
    score: result.score,
  };
}

export function summarizeDocument(document: DocumentVm): DocumentSummaryVm {
  return {
    id: document.id,
    title: document.title,
    blockTintOverride: document.blockTintOverride,
    preview: document.blocks
      .map((block) => getBlockPlainText(block.kind, block.content))
      .find((text) => text.trim().length > 0) ?? '',
    updatedAt: document.updatedAt,
    lastOpenedAt: document.lastOpenedAt,
    blockCount: document.blocks.length,
  };
}

export function replaceBlockInDocument(document: DocumentVm, nextBlock: BlockVm): DocumentVm {
  const blocks = document.blocks
    .map((block) => (block.id === nextBlock.id ? nextBlock : block))
    .sort((left, right) => left.position - right.position);

  return {
    ...document,
    blocks,
  };
}

export function reorderDocumentBlocks(document: DocumentVm, blockId: string, targetPosition: number): DocumentVm {
  const sourceIndex = document.blocks.findIndex((block) => block.id === blockId);
  if (sourceIndex < 0 || sourceIndex === targetPosition) {
    return document;
  }

  const nextBlocks = [...document.blocks];
  const [moved] = nextBlocks.splice(sourceIndex, 1);
  nextBlocks.splice(targetPosition, 0, moved);

  return {
    ...document,
    blocks: nextBlocks.map((block, index) => ({
      ...block,
      position: index,
    })),
  };
}

export function touchDocument(document: DocumentVm, updatedAt: number): DocumentVm {
  return {
    ...document,
    updatedAt,
  };
}
