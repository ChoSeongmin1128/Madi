import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { BlockVm } from '../application/models/document';
import { useBlockController } from '../app/controllers';
import { createEmptyMarkdownContent } from '../lib/markdown';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { BlockEditorHandle } from '../lib/editorHandle';
import type { CodeLanguageId } from '../lib/codeLanguageRegistry';
import type { BlockCaretPlacement, BlockKind } from '../lib/types';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import {
  buildBlockContextMenuItems,
  handleBlockContextAction,
  isEffectivelyEmpty,
  preloadBlockCardEditor,
} from './blockCardSupport';
import { BlockCardActions } from './blockCard/BlockCardActions';
import { BlockCardEditor } from './blockCard/BlockCardEditor';
import { BlockCardMenus } from './blockCard/BlockCardMenus';

interface BlockCardProps {
  block: BlockVm;
  isSelected: boolean;
  isBlockSelected: boolean;
  isAllSelected: boolean;
  isAlternate: boolean;
  isDragging: boolean;
  isMenuOpen: boolean;
  onGripPointerDown: (blockId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onMenuClose: () => void;
}

export function BlockCard({
  block,
  isSelected,
  isBlockSelected,
  isAllSelected,
  isAlternate,
  isDragging,
  isMenuOpen,
  onGripPointerDown,
  onMenuClose,
}: BlockCardProps) {
  const [typeMenuAnchor, setTypeMenuAnchor] = useState<DOMRect | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const blockCardRef = useRef<HTMLElement | null>(null);
  const [markdownSelectionState, setMarkdownSelectionState] = useState({
    hasSelection: false,
    isWholeBlockSelected: false,
  });
  const {
    changeBlockKind,
    copySelectedBlocks,
    copySingleBlock,
    createBlockBelow,
    deleteSelectedBlocks,
    deleteBlock,
    updateCodeBlock,
    updateMarkdownBlock,
    updateTextBlock,
  } = useBlockController();
  const setSelectedBlockId = useDocumentSessionStore((state) => state.setSelectedBlockId);
  const setAllBlocksSelected = useDocumentSessionStore((state) => state.setAllBlocksSelected);
  const focusPreviousBlock = useDocumentSessionStore((state) => state.focusPreviousBlock);
  const focusNextBlock = useDocumentSessionStore((state) => state.focusNextBlock);
  const focusRequest = useDocumentSessionStore((state) => state.focusRequest);
  const selectedBlockIds = useDocumentSessionStore((state) => state.selectedBlockIds);
  const lastCodeLanguage = useDocumentSessionStore((state) => state.lastCodeLanguage);
  const setLastCodeLanguage = useDocumentSessionStore((state) => state.setLastCodeLanguage);
  const defaultBlockKind = useWorkspaceStore((state) => state.defaultBlockKind);
  const editorRef = useRef<BlockEditorHandle | null>(null);

  const isEmpty = isEffectivelyEmpty(block);
  const hasSubsetSelection = selectedBlockIds.length > 0;
  const shouldActOnSelectedSet = isAllSelected || (hasSubsetSelection && selectedBlockIds.includes(block.id));
  const focusPlacement: BlockCaretPlacement | null =
    focusRequest?.blockId === block.id ? focusRequest.caret : null;
  const focusNonce = focusRequest?.blockId === block.id ? focusRequest.nonce : 0;

  useEffect(() => {
    if (!isSelected) {
      return;
    }

    void preloadBlockCardEditor(block.kind);
  }, [block.kind, isSelected]);

  const handleTypeChange = useCallback(async (kind: BlockKind) => {
    setTypeMenuAnchor(null);
    setContextMenuPosition(null);
    onMenuClose();
    if (kind === block.kind) {
      return;
    }

    await changeBlockKind(block.id, kind);

    if (kind === 'markdown') {
      updateMarkdownBlock(block.id, createEmptyMarkdownContent());
      return;
    }

    if (kind === 'text') {
      updateTextBlock(block.id, '');
      return;
    }

    if (kind === 'code') {
      updateCodeBlock(block.id, '', lastCodeLanguage);
      return;
    }
  }, [
    block.id,
    block.kind,
    changeBlockKind,
    lastCodeLanguage,
    onMenuClose,
    updateCodeBlock,
    updateMarkdownBlock,
    updateTextBlock,
  ]);

  const handleDeleteBlock = useCallback(() => {
    setContextMenuPosition(null);
    if (shouldActOnSelectedSet) {
      void deleteSelectedBlocks();
      return;
    }
    void deleteBlock(block.id);
  }, [block.id, deleteBlock, deleteSelectedBlocks, shouldActOnSelectedSet]);

  const handleDeleteIfEmpty = handleDeleteBlock;

  const handleLanguageChange = useCallback((language: CodeLanguageId) => {
    setContextMenuPosition(null);
    onMenuClose();
    if (block.kind !== 'code') {
      return;
    }
    setLastCodeLanguage(language);
    updateCodeBlock(block.id, block.content, language);
  }, [block.content, block.id, block.kind, onMenuClose, setLastCodeLanguage, updateCodeBlock]);

  const handleBlockFocus = () => {
    setSelectedBlockId(block.id);
    setAllBlocksSelected(false);
    useDocumentSessionStore.getState().setActiveEditorRef(editorRef);
  };

  const handleCut = useCallback(async () => {
    if (shouldActOnSelectedSet) {
      await copySelectedBlocks();
      await deleteSelectedBlocks();
      return;
    }
    await editorRef.current?.cut();
  }, [copySelectedBlocks, deleteSelectedBlocks, shouldActOnSelectedSet]);

  const handleCopy = useCallback(async () => {
    if (shouldActOnSelectedSet) {
      await copySelectedBlocks();
      return;
    }
    await editorRef.current?.copy();
  }, [copySelectedBlocks, shouldActOnSelectedSet]);

  const handlePaste = useCallback(async () => {
    await editorRef.current?.paste();
  }, []);

  const handleSelectAll = useCallback(async () => {
    editorRef.current?.selectAll();
  }, []);

  const contextMenuItems = useMemo(
    () => buildBlockContextMenuItems(),
    [],
  );

  const handleContextAction = useCallback(
    async (actionId: string) => {
      await handleBlockContextAction(actionId, {
        onCut: handleCut,
        onCopy: handleCopy,
        onPaste: handlePaste,
        onSelectAll: handleSelectAll,
        onDelete: handleDeleteIfEmpty,
      });
    },
    [handleCopy, handleCut, handleDeleteIfEmpty, handlePaste, handleSelectAll],
  );

  return (
    <section
      ref={blockCardRef}
      data-block-card-id={block.id}
      className={`block-card block-card-${block.kind}${isSelected ? ' is-selected' : ''}${isBlockSelected ? ' is-block-selected' : ''}${markdownSelectionState.hasSelection ? ' has-editor-selection' : ''}${markdownSelectionState.isWholeBlockSelected ? ' is-markdown-select-all' : ''}${isAllSelected ? ' is-all-selected' : ''}${isAlternate ? ' is-alternate' : ''}${isDragging ? ' is-dragging' : ''}`}
      onPointerEnter={() => {
        void preloadBlockCardEditor(block.kind);
      }}
      onClick={() => {
        handleBlockFocus();
        setTypeMenuAnchor(null);
        setContextMenuPosition(null);
        onMenuClose();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!shouldActOnSelectedSet) {
          handleBlockFocus();
        }
        setTypeMenuAnchor(null);
        onMenuClose();
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
      }}
      onKeyDownCapture={(event) => {
        if (event.key === '/' && isEmpty) {
          event.preventDefault();
          onMenuClose();
          const rect = blockCardRef.current?.getBoundingClientRect();
          if (rect) setTypeMenuAnchor(rect);
        }
      }}
    >
      <BlockCardActions
        blockId={block.id}
        shouldActOnSelectedSet={shouldActOnSelectedSet}
        isMenuOpen={isMenuOpen}
        onGripPointerDown={onGripPointerDown}
        onCopySelectedBlocks={copySelectedBlocks}
        onCopySingleBlock={copySingleBlock}
        onDeleteBlock={handleDeleteBlock}
      />

      <BlockCardMenus
        block={block}
        isEmpty={isEmpty}
        isSelected={isSelected}
        isMenuOpen={isMenuOpen}
        typeMenuAnchor={typeMenuAnchor}
        contextMenuPosition={contextMenuPosition}
        contextMenuItems={contextMenuItems}
        onLanguageChange={handleLanguageChange}
        onTypeChange={handleTypeChange}
        onDeleteIfEmpty={handleDeleteIfEmpty}
        onContextAction={handleContextAction}
        onTypeMenuClose={() => setTypeMenuAnchor(null)}
        onMenuClose={onMenuClose}
        onContextMenuClose={() => setContextMenuPosition(null)}
      />

      <BlockCardEditor
        block={block}
        editorRef={editorRef}
        isSelected={isSelected}
        focusPlacement={focusPlacement}
        focusNonce={focusNonce}
        onFocus={handleBlockFocus}
        onSelectionVisualChange={setMarkdownSelectionState}
        onCreateBelow={async () => createBlockBelow(block.id, defaultBlockKind)}
        onNavigatePrevious={(caret) => focusPreviousBlock(block.id, caret)}
        onNavigateNext={(caret) => focusNextBlock(block.id, caret)}
        onDeleteIfEmpty={handleDeleteIfEmpty}
        onMarkdownChange={(content) => updateMarkdownBlock(block.id, content)}
        onTextChange={(content) => updateTextBlock(block.id, content)}
        onCodeChange={(content, language) => updateCodeBlock(block.id, content, language ?? block.language)}
      />
    </section>
  );
}
