import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDismissibleLayer } from './useDismissibleLayer';

function Harness({
  enabled = true,
  onDismiss,
}: {
  enabled?: boolean;
  onDismiss: () => void;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  useDismissibleLayer({ enabled, layerRef, onDismiss });

  return (
    <>
      <div ref={layerRef}>
        <button type="button">안쪽</button>
      </div>
      <button type="button">바깥쪽</button>
    </>
  );
}

describe('useDismissibleLayer', () => {
  it('dismisses on outside pointer and escape key', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<Harness onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: '안쪽' }));
    expect(onDismiss).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '바깥쪽' }));
    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('does not dismiss while disabled', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<Harness enabled={false} onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: '바깥쪽' }));
    await user.keyboard('{Escape}');

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
