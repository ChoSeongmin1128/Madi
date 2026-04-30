import { describe, expect, it } from 'vitest';
import { shouldSuppressConsoleWarning } from './consoleWarnings';

describe('shouldSuppressConsoleWarning', () => {
  it('suppresses duplicate linkify custom protocol registration warnings', () => {
    expect(
      shouldSuppressConsoleWarning([
        'linkifyjs: already initialized - will not register custom scheme "http" until manual call of linkify.init(). Register all schemes and plugins before invoking linkify the first time.',
      ]),
    ).toBe(true);
  });

  it('does not suppress unrelated linkify warnings', () => {
    expect(
      shouldSuppressConsoleWarning([
        'linkifyjs: already initialized - will not register plugin "hashtag" until manual call of linkify.init(). Register all schemes and plugins before invoking linkify the first time.',
      ]),
    ).toBe(false);
  });

  it('does not suppress non-linkify warnings', () => {
    expect(shouldSuppressConsoleWarning(['The `validate` option is deprecated.'])).toBe(false);
    expect(shouldSuppressConsoleWarning([new Error('linkifyjs failed')])).toBe(false);
  });
});
