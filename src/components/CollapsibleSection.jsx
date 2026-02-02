import React, { useState } from 'react';

/**
 * CollapsibleSection - A section that can be collapsed/expanded
 * 
 * @param {Object} props
 * @param {string} props.title - Title of the section
 * @param {React.ReactNode} props.children - Content to render inside
 * @param {boolean} props.defaultExpanded - Whether the section starts expanded
 * @param {React.ReactNode} props.icon - Optional icon to show before title
 * @param {React.ReactNode} props.badge - Optional badge to show after title
 * @param {string} props.className - Additional CSS classes
 */
const CollapsibleSection = ({
  title,
  children,
  defaultExpanded = true,
  icon,
  badge,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#313244]/50 rounded-md transition-colors group"
      >
        {/* Chevron */}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 16 16" 
          fill="currentColor" 
          className={`text-[#6c7086] transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M6 4l4 4-4 4V4z"/>
        </svg>

        {/* Icon */}
        {icon && (
          <span className="text-[#6c7086] group-hover:text-[#89b4fa] transition-colors">
            {icon}
          </span>
        )}

        {/* Title */}
        <span className="text-[10px] font-bold text-[#6c7086] uppercase tracking-wider group-hover:text-[#a6adc8] transition-colors flex-1 text-left">
          {title}
        </span>

        {/* Badge */}
        {badge && (
          <span className="text-[10px] text-[#585b70]">
            {badge}
          </span>
        )}
      </button>

      {/* Content */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="pt-1 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
