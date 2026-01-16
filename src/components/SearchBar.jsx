import React, { forwardRef } from 'react'

const SearchBar = forwardRef(({ value, onChange, isLoading, hasResults }, ref) => {
  return (
    <div className={`search-bar ${hasResults ? 'has-results' : ''}`}>
      <div className="search-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        ref={ref}
        type="text"
        className="search-input"
        placeholder="Search..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  )
})

SearchBar.displayName = 'SearchBar'

export default SearchBar
