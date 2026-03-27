import type { BlockVm } from '../../application/models/document';
import type { CodeLanguageId } from '../../lib/codeLanguageRegistry';
import type { BlockKind } from '../../lib/types';
import { BlockMenu } from '../BlockMenu';
import { CodeLanguageTrigger } from '../CodeLanguageMenu';
import { ContextMenu, type ContextMenuItem } from '../ContextMenu';
import { TypeMenu } from '../TypeMenu';

interface BlockCardMenusProps {
  block: BlockVm;
  isEmpty: boolean;
  isSelected: boolean;
  isMenuOpen: boolean;
  typeMenuAnchor: DOMRect | null;
  contextMenuPosition: { x: number; y: number } | null;
  contextMenuItems: ContextMenuItem[];
  onLanguageChange: (language: CodeLanguageId) => void;
  onTypeChange: (kind: BlockKind) => Promise<void>;
  onDeleteIfEmpty: () => void;
  onContextAction: (actionId: string) => Promise<void>;
  onTypeMenuClose: () => void;
  onMenuClose: () => void;
  onContextMenuClose: () => void;
}

export function BlockCardMenus({
  block,
  isEmpty,
  isSelected,
  isMenuOpen,
  typeMenuAnchor,
  contextMenuPosition,
  contextMenuItems,
  onLanguageChange,
  onTypeChange,
  onDeleteIfEmpty,
  onContextAction,
  onTypeMenuClose,
  onMenuClose,
  onContextMenuClose,
}: BlockCardMenusProps) {
  return (
    <>
      {block.kind === 'markdown' || block.kind === 'text' ? (
        <span className="block-kind-badge">
          {block.kind === 'markdown' ? 'Markdown' : 'Text'}
        </span>
      ) : null}

      {block.kind === 'code' ? (
        <CodeLanguageTrigger
          value={block.language}
          isVisible={isSelected || isMenuOpen || contextMenuPosition != null}
          onSelect={onLanguageChange}
        />
      ) : null}

      {typeMenuAnchor ? (
        <TypeMenu
          anchorRect={typeMenuAnchor}
          onSelect={(kind) => void onTypeChange(kind)}
          onClose={onTypeMenuClose}
        />
      ) : null}
      {isMenuOpen ? (
        <BlockMenu
          block={block}
          isEmpty={isEmpty}
          onClose={onMenuClose}
          onDelete={onDeleteIfEmpty}
          onSelectKind={(kind) => void onTypeChange(kind)}
        />
      ) : null}
      {contextMenuPosition ? (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          items={contextMenuItems}
          onAction={onContextAction}
          onClose={onContextMenuClose}
        />
      ) : null}
    </>
  );
}
