import { appUseCases } from '../application/runtime';

export const createBlockBelow = appUseCases.createBlockBelow;
export const changeBlockKind = appUseCases.changeBlockKind;
export const moveBlock = appUseCases.moveBlock;
export const deleteBlock = appUseCases.deleteBlock;
export const updateMarkdownBlock = appUseCases.updateMarkdownBlock;
export const updateCodeBlock = appUseCases.updateCodeBlock;
export const updateTextBlock = appUseCases.updateTextBlock;
export const isBlockClipboardText = appUseCases.isBlockClipboardText;
export const copySelectedBlocks = appUseCases.copySelectedBlocks;
export const copySingleBlock = appUseCases.copySingleBlock;
export const pasteBlocks = appUseCases.pasteBlocks;
export const deleteSelectedBlocks = appUseCases.deleteSelectedBlocks;
export const undoBlockOperation = appUseCases.undoBlockOperation;
export const redoBlockOperation = appUseCases.redoBlockOperation;
