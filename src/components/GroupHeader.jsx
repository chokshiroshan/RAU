import React, { useRef, useEffect, useState } from 'react'
import { ipcRenderer } from '../services/electron'
import { logger } from '../utils/logger'

function GroupHeader({ appName, category, itemCount, isExpanded, onToggle, icon, result }) {
  const headerRef = useRef(null)
  const [appIcon, setAppIcon] = useState(null)

  useEffect(() => {
    if (icon) {
      setAppIcon(icon)
      return
    }

    if (!ipcRenderer) return

    const loadAppIcon = async () => {
      try {
        const iconData = await ipcRenderer.invoke('get-app-icon-by-name', appName)
        if (iconData) {
          setAppIcon(iconData)
        }
      } catch (error) {
        logger.error('GroupHeader', 'Error loading app icon', error)
      }
    }

    loadAppIcon()
  }, [appName, icon])

  const getCategoryColor = (category) => {
    switch (category) {
      case 'browsers':
        return 'rgba(59, 130, 246, 0.15)'
      case 'terminals':
        return 'rgba(16, 185, 129, 0.15)'
      case 'editors':
        return 'rgba(139, 92, 246, 0.15)'
      case 'productivity':
        return 'rgba(245, 158, 11, 0.15)'
      case 'system':
        return 'rgba(107, 114, 128, 0.15)'
      default:
        return 'rgba(255, 255, 255, 0.08)'
    }
  }

  const getCategoryBorderColor = (category) => {
    switch (category) {
      case 'browsers':
        return 'rgba(59, 130, 246, 0.3)'
      case 'terminals':
        return 'rgba(16, 185, 129, 0.3)'
      case 'editors':
        return 'rgba(139, 92, 246, 0.3)'
      case 'productivity':
        return 'rgba(245, 158, 11, 0.3)'
      case 'system':
        return 'rgba(107, 114, 128, 0.3)'
      default:
        return 'rgba(255, 255, 255, 0.15)'
    }
  }

  const getCategoryTextColor = (category) => {
    switch (category) {
      case 'browsers':
        return '#60A5FA'
      case 'terminals':
        return '#34D399'
      case 'editors':
        return '#A78BFA'
      case 'productivity':
        return '#FBBF24'
      case 'system':
        return '#9CA3AF'
      default:
        return 'rgba(255, 255, 255, 0.55)'
    }
  }

  return (
    <div
      ref={headerRef}
      className={`group-header ${isExpanded ? 'expanded' : 'collapsed'}`}
      onClick={onToggle}
    >
      <div className="group-header-left">
        <div className="group-app-icon">
          {appIcon ? (
            <img src={appIcon} alt={appName} className="group-app-icon-img" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'rgba(255, 255, 255, 0.55)' }}
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          )}
        </div>
        <span className="group-app-name">{appName}</span>
        {category && (
          <span
            className="group-category-badge"
            style={{
              background: getCategoryColor(category),
              border: `0.0625rem solid ${getCategoryBorderColor(category)}`,
              color: getCategoryTextColor(category)
            }}
          >
            {category}
          </span>
        )}
      </div>
      <div className="group-header-right">
        <span className="group-item-count">{itemCount}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`group-chevron ${isExpanded ? 'expanded' : ''}`}
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

export default GroupHeader
