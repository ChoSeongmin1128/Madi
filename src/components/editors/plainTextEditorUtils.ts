export function getLineStart(value: string, position: number) {
  return value.lastIndexOf('\n', Math.max(position - 1, 0)) + 1;
}

export function getLineEnd(value: string, position: number) {
  const nextBreak = value.indexOf('\n', position);
  return nextBreak === -1 ? value.length : nextBreak;
}

export function syncTextareaHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = '0px';
  textarea.style.height = `${Math.max(textarea.scrollHeight, 36)}px`;
}
