import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllDocumentSync,
  flushDocumentSaves,
  queueDocumentSave,
  setDocumentSyncErrorHandler,
} from './documentSync';
import { desktopApi } from '../lib/desktopApi';
import { enqueueSyncMutation } from './syncBoundary';

vi.mock('../lib/desktopApi', () => ({
  desktopApi: {
    updateMarkdownBlock: vi.fn(),
    updateCodeBlock: vi.fn(),
    updateTextBlock: vi.fn(),
    flushDocument: vi.fn(),
  },
}));

vi.mock('./syncBoundary', () => ({
  enqueueSyncMutation: vi.fn(),
}));

function createDeferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe('documentSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(desktopApi.updateMarkdownBlock).mockReset();
    vi.mocked(desktopApi.updateCodeBlock).mockReset();
    vi.mocked(desktopApi.updateTextBlock).mockReset();
    vi.mocked(desktopApi.flushDocument).mockReset();
    vi.mocked(enqueueSyncMutation).mockReset();
    setDocumentSyncErrorHandler(null);
    clearAllDocumentSync();
  });

  afterEach(() => {
    clearAllDocumentSync();
    setDocumentSyncErrorHandler(null);
    vi.useRealTimers();
  });

  it('keeps pending autosave content when the timer save fails and retries on flush', async () => {
    const errorHandler = vi.fn();
    setDocumentSyncErrorHandler(errorHandler);
    vi.mocked(desktopApi.updateMarkdownBlock)
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce({} as never);
    vi.mocked(desktopApi.flushDocument).mockResolvedValueOnce(123);

    queueDocumentSave('doc-1', 'block-1', {
      kind: 'markdown',
      content: '# hello',
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(desktopApi.updateMarkdownBlock).toHaveBeenCalledTimes(1);

    await expect(flushDocumentSaves('doc-1')).resolves.toBe(123);
    expect(desktopApi.updateMarkdownBlock).toHaveBeenCalledTimes(2);
    expect(desktopApi.flushDocument).toHaveBeenCalledTimes(1);
    expect(enqueueSyncMutation).toHaveBeenCalledTimes(1);
  });

  it('does not drop a newer queued save when an older save finishes later', async () => {
    const deferred = createDeferred();
    vi.mocked(desktopApi.updateMarkdownBlock)
      .mockImplementationOnce(async () => {
        await deferred.promise;
        return {} as never;
      })
      .mockResolvedValueOnce({} as never);
    vi.mocked(desktopApi.flushDocument).mockResolvedValueOnce(456);

    queueDocumentSave('doc-1', 'block-1', {
      kind: 'markdown',
      content: 'first',
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(desktopApi.updateMarkdownBlock).toHaveBeenCalledTimes(1);

    queueDocumentSave('doc-1', 'block-1', {
      kind: 'markdown',
      content: 'second',
    });

    deferred.resolve();
    await Promise.resolve();

    await expect(flushDocumentSaves('doc-1')).resolves.toBe(456);
    expect(desktopApi.updateMarkdownBlock).toHaveBeenNthCalledWith(1, 'block-1', 'first');
    expect(desktopApi.updateMarkdownBlock).toHaveBeenNthCalledWith(2, 'block-1', 'second');
    expect(desktopApi.flushDocument).toHaveBeenCalledTimes(1);
  });
});
