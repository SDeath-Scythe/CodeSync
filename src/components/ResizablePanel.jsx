import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ResizablePanel - A panel that can be resized and collapsed
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to render inside the panel
 * @param {string} props.side - Which side the resize handle is on: 'left' | 'right' | 'top' | 'bottom'
 * @param {number} props.defaultSize - Default size in pixels
 * @param {number} props.minSize - Minimum size in pixels
 * @param {number} props.maxSize - Maximum size in pixels
 * @param {boolean} props.collapsible - Whether the panel can be collapsed
 * @param {boolean} props.defaultCollapsed - Whether the panel starts collapsed
 * @param {string} props.collapseIcon - Icon to show when collapsed (optional)
 * @param {string} props.title - Title to show in collapse button tooltip
 * @param {function} props.onResize - Callback when panel is resized
 * @param {function} props.onCollapse - Callback when panel is collapsed/expanded
 * @param {string} props.className - Additional CSS classes
 */
const ResizablePanel = ({
  children,
  side = 'right',
  defaultSize = 256,
  minSize = 150,
  maxSize = 600,
  collapsible = true,
  defaultCollapsed = false,
  title = 'Panel',
  onResize,
  onCollapse,
  className = '',
}) => {
  const [size, setSize] = useState(defaultSize);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const isHorizontal = side === 'left' || side === 'right';

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = isHorizontal ? e.clientX : e.clientY;
    startSizeRef.current = size;
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [size, isHorizontal]);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;

    const currentPos = isHorizontal ? e.clientX : e.clientY;
    const diff = side === 'right' || side === 'bottom' 
      ? startPosRef.current - currentPos 
      : currentPos - startPosRef.current;
    
    const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + diff));
    setSize(newSize);
    onResize?.(newSize);
  }, [isResizing, isHorizontal, side, minSize, maxSize, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      onCollapse?.(newValue);
      return newValue;
    });
  }, [onCollapse]);

  // Handle double-click to collapse/expand
  const handleDoubleClick = useCallback(() => {
    if (collapsible) {
      toggleCollapse();
    }
  }, [collapsible, toggleCollapse]);

  // Resize handle position classes
  const handlePositionClasses = {
    left: 'left-0 top-0 h-full w-1 cursor-col-resize hover:w-1.5',
    right: 'right-0 top-0 h-full w-1 cursor-col-resize hover:w-1.5',
    top: 'top-0 left-0 w-full h-1 cursor-row-resize hover:h-1.5',
    bottom: 'bottom-0 left-0 w-full h-1 cursor-row-resize hover:h-1.5',
  };

  // Collapse button position
  const collapseButtonPosition = {
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full',
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
  };

  // Collapse icon rotation
  const getCollapseIcon = () => {
    const iconMap = {
      left: isCollapsed ? '→' : '←',
      right: isCollapsed ? '←' : '→',
      top: isCollapsed ? '↓' : '↑',
      bottom: isCollapsed ? '↑' : '↓',
    };
    return iconMap[side];
  };

  // Panel size styles
  const sizeStyle = isHorizontal
    ? { width: isCollapsed ? 0 : size, minWidth: isCollapsed ? 0 : minSize }
    : { height: isCollapsed ? 0 : size, minHeight: isCollapsed ? 0 : minSize };

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 transition-all duration-200 ease-out ${isCollapsed ? 'overflow-hidden' : ''} ${className}`}
      style={sizeStyle}
    >
      {/* Panel Content */}
      <div className={`h-full w-full ${isCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'} transition-opacity duration-150`}>
        {children}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={`absolute ${handlePositionClasses[side]} z-20 group`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          {/* Visual indicator */}
          <div className={`absolute ${isHorizontal ? 'w-0.5 h-full left-1/2 -translate-x-1/2' : 'h-0.5 w-full top-1/2 -translate-y-1/2'} bg-transparent group-hover:bg-[#89b4fa] transition-all duration-150 ${isResizing ? 'bg-[#89b4fa]' : ''}`} />
        </div>
      )}

      {/* Collapse Button */}
      {collapsible && (
        <button
          onClick={toggleCollapse}
          className={`absolute ${collapseButtonPosition[side]} z-30 bg-[#1e1e2e] border border-[#313244] hover:border-[#89b4fa] text-[#6c7086] hover:text-[#89b4fa] w-5 h-10 flex items-center justify-center rounded transition-all duration-150 hover:bg-[#313244] ${isCollapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          title={`${isCollapsed ? 'Expand' : 'Collapse'} ${title}`}
          style={{ 
            opacity: isCollapsed ? 1 : undefined,
          }}
        >
          <span className="text-xs font-bold">{getCollapseIcon()}</span>
        </button>
      )}
    </div>
  );
};

export default ResizablePanel;
