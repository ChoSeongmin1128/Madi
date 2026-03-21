const AUTO_TITLE_PATTERN = /^Untitled(?: \((\d+)\))?$/;

export function isAutomaticDocumentTitle(title: string | null | undefined) {
  if (!title) {
    return false;
  }

  return AUTO_TITLE_PATTERN.test(title.trim());
}

export function getEditableDocumentTitle(title: string | null | undefined) {
  if (!title) {
    return '';
  }

  return isAutomaticDocumentTitle(title) ? '' : title;
}

export function getVisibleDocumentTitle(title: string | null | undefined) {
  if (!title || !title.trim()) {
    return 'Untitled';
  }

  return title.trim();
}
