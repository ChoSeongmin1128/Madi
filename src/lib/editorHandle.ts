export interface BlockEditorHandle {
  cut: () => Promise<boolean>;
  copy: () => Promise<boolean>;
  paste: () => Promise<boolean>;
  selectAll: () => boolean;
}
