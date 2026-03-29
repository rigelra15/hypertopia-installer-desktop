import PropTypes from 'prop-types'

/**
 * Custom tooltip with an arrow pointer.
 *
 * Usage:
 *   <Tooltip content="Teks tooltip" side="right">
 *     <button>...</button>
 *   </Tooltip>
 *
 * side: 'top' | 'right' | 'bottom' | 'left'  (default: 'right')
 */
export function Tooltip({ children, content, side = 'right', className = '' }) {
  if (!content) return children

  // Panel + arrow positioning per side
  const panelPos = {
    right:  'left-full top-1/2 -translate-y-1/2 ml-2.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2.5',
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2.5',
  }

  // Arrow: small rotated square revealing two borders
  const arrowPos = {
    right:  'left-[-5px] top-1/2 -translate-y-1/2 border-l border-b',
    left:   'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t',
    top:    'top-full left-1/2 -translate-x-1/2 -mt-[5px] border-b border-r',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 mb-[-5px] border-t border-l',
  }

  // Slide-in direction for animation
  const slideIn = {
    right:  'translate-x-1 group-hover:translate-x-0',
    left:   '-translate-x-1 group-hover:translate-x-0',
    top:    'translate-y-1 group-hover:translate-y-0',
    bottom: '-translate-y-1 group-hover:translate-y-0',
  }

  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}

      {/* Tooltip panel */}
      <div
        className={`
          pointer-events-none absolute z-[200] whitespace-nowrap
          rounded-lg bg-white dark:bg-[#1e1e1e]
          px-3 py-1.5 shadow-xl
          text-[11px] font-medium text-gray-700 dark:text-white/85
          opacity-0 transition-all duration-150
          group-hover:opacity-100
          ${panelPos[side] || panelPos.right}
          ${slideIn[side] || slideIn.right}
        `}
      >
        {content}

        {/* Arrow */}
        <div
          className={`
            absolute h-2.5 w-2.5 rotate-45
            bg-white dark:bg-[#1e1e1e]
            border-gray-200 dark:border-white/10
            ${arrowPos[side] || arrowPos.right}
          `}
        />
      </div>
    </div>
  )
}

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.node,
  side: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  className: PropTypes.string,
}
