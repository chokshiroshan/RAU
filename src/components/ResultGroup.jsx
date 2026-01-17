import React, { useState, useRef, useEffect } from 'react'
import GroupHeader from './GroupHeader'
import { logger } from '../utils/logger'

function ResultGroup({ group, selectedIndex, onSelect, onHover, groupIndex, flatIndex }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const groupRef = useRef(null)

  const handleToggle = () => {
    setIsExpanded(prev => !prev)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' && !isExpanded) {
      e.preventDefault()
      setIsExpanded(true)
    } else if (e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault()
      setIsExpanded(false)
    }
  }

  return (
    <div
      ref={groupRef}
      className="result-group"
      onKeyDown={handleKeyDown}
    >
      <GroupHeader
        appName={group.appName}
        category={group.category}
        itemCount={group.items.length}
        isExpanded={isExpanded}
        onToggle={handleToggle}
        icon={group.icon}
        result={group.items[0]}
      />
      {isExpanded && (
        <div className="group-items">
          {group.items.map((item, index) => {
            const itemFlatIndex = flatIndex + index
            const isSelected = itemFlatIndex === selectedIndex
            if (group.appName.includes('Comet') || group.appName.includes('Safari')) {
              logger.debug('ResultGroup', `${group.appName} item #${index}`, {
                itemFlatIndex,
                selectedIndex,
                isSelected,
                itemType: item.type,
                groupStartIndex: flatIndex,
                groupEndIndex: flatIndex + group.items.length - 1
              })
            }
            return (
              <div
                key={`${item.type}-${item.url || item.path || item.name || item.id}-${index}`}
                className={`result-item ${isSelected ? 'selected' : ''} ${item.type}-result`}
                onClick={() => onSelect(itemFlatIndex)}
                onMouseEnter={() => onHover(itemFlatIndex)}
                style={{ paddingLeft: '1.5rem', '--stagger-index': itemFlatIndex }}
              >
                <div className="result-icon">
                  {item.type === 'command' ? (
                    <span className="command-icon">{item.icon}</span>
                  ) : item.type === 'web-search' ? (
                    <span className="web-search-icon">{item.icon || '🔍'}</span>
                  ) : item.type === 'calculator' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: '#10B981' }}
                    >
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <line x1="8" y1="6" x2="16" y2="6" />
                      <line x1="8" y1="10" x2="8" y2="10.01" />
                      <line x1="12" y1="10" x2="12" y2="10.01" />
                      <line x1="16" y1="10" x2="16" y2="10.01" />
                      <line x1="8" y1="14" x2="8" y2="14.01" />
                      <line x1="12" y1="14" x2="12" y2="14.01" />
                      <line x1="16" y1="14" x2="16" y2="14.01" />
                      <line x1="8" y1="18" x2="8" y2="18.01" />
                      <line x1="12" y1="18" x2="16" y2="18" />
                    </svg>
                  ) : item.type === 'app' ? (
                    item.icon ? (
                      <img src={item.icon} alt={item.name} className="app-icon-img" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    )
                  ) : item.type === 'tab' || item.type === 'window' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                </div>
                <div className="result-content">
                  <div className="result-name">
                    {item.name}
                    {(item.type === 'tab' || item.type === 'window') && (
                      <span className="result-browser-badge">{item.browser}</span>
                    )}
                  </div>
                  {item.type !== 'app' && (
                    <div className="result-path">
                      {item.type === 'tab' ? item.url : item.type === 'window' ? item.browser : item.path}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ResultGroup
