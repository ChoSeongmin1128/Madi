import { ChevronsLeft, ChevronsRight, Plus, Search, Settings2 } from 'lucide-react';

interface SidebarRailProps {
  isExpanded: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onCreateDocument: () => void;
  onSearchTrigger: () => void;
  onSettingsOpen: () => void;
}

export function SidebarRail({
  isExpanded,
  onCollapse,
  onExpand,
  onCreateDocument,
  onSearchTrigger,
  onSettingsOpen,
}: SidebarRailProps) {
  return (
    <div className="sidebar-rail" aria-label="사이드바 레일">
      <button
        className="sidebar-rail-button"
        type="button"
        aria-label={isExpanded ? '사이드바 접기' : '사이드바 펼치기'}
        onClick={isExpanded ? onCollapse : onExpand}
      >
        {isExpanded ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
      </button>
      <button
        className="sidebar-rail-button"
        type="button"
        aria-label="새 문서 만들기"
        onClick={onCreateDocument}
      >
        <Plus size={16} />
      </button>
      <button
        className="sidebar-rail-button"
        type="button"
        aria-label="검색 열기"
        onClick={onSearchTrigger}
      >
        <Search size={16} />
      </button>
      <button
        className="sidebar-rail-button sidebar-rail-footer-button"
        type="button"
        aria-label="설정 열기"
        onClick={onSettingsOpen}
      >
        <Settings2 size={16} />
      </button>
    </div>
  );
}
