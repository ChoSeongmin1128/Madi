import { appUseCases } from '../application/runtime';

export const flushCurrentDocument = appUseCases.flushCurrentDocument;
export const createDocument = appUseCases.createDocument;
export const openDocument = appUseCases.openDocument;
export const commitDocumentTitle = appUseCases.commitDocumentTitle;
export const deleteDocument = appUseCases.deleteDocument;
export const emptyTrash = appUseCases.emptyTrash;
export const restoreDocumentFromTrash = appUseCases.restoreDocumentFromTrash;
export const setDocumentBlockTintOverride = appUseCases.setDocumentBlockTintOverride;
