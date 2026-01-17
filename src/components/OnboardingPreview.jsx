import React, { useEffect, useState } from 'react'

const SCENES = [
  {
    id: 'apps',
    caption: 'Launch apps instantly.',
    query: 'chrome',
    results: [
      { icon: '🌐', name: 'Google Chrome', meta: '/Applications/Google Chrome.app' },
      { icon: '🧭', name: 'Safari', meta: '/Applications/Safari.app' },
      { icon: '🦁', name: 'Brave Browser', meta: '/Applications/Brave Browser.app' },
    ],
  },
  {
    id: 'tabs',
    caption: 'Jump to the exact tab.',
    query: 'design system',
    results: [
      { icon: '🌐', name: 'RAU UI — Figma', meta: 'figma.com', badge: 'Chrome' },
      { icon: '📄', name: 'Design Tokens Doc', meta: 'notion.so', badge: 'Safari' },
      { icon: '🧠', name: 'Glassmorphism examples', meta: 'github.com', badge: 'Brave' },
    ],
  },
  {
    id: 'files',
    caption: 'Find files in a heartbeat.',
    query: 'pricing spec',
    results: [
      { icon: '📄', name: 'Pricing-Spec.pdf', meta: '~/Documents/Specs' },
      { icon: '📑', name: 'Q1-Plan.docx', meta: '~/Documents/Planning' },
      { icon: '📊', name: 'Revenue.xlsx', meta: '~/Documents/Finance' },
    ],
  },
  {
    id: 'calculator',
    caption: 'Type math, get answers.',
    query: '128 * 1.08',
    results: [
      { icon: '🧮', name: '138.24', meta: 'Calculator' },
      { icon: '⚡', name: 'Quick action: copy result', meta: 'Enter to copy' },
    ],
  },
]

const FADE_DURATION_MS = 200
const ROTATE_MS = 2800

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    if (media.addEventListener) {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  return reducedMotion
}

function OnboardingPreview() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [sceneIndex, setSceneIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion) return undefined

    let fadeTimeout = null
    const interval = setInterval(() => {
      setIsFading(true)
      fadeTimeout = setTimeout(() => {
        setSceneIndex(prev => (prev + 1) % SCENES.length)
        setIsFading(false)
      }, FADE_DURATION_MS)
    }, ROTATE_MS)

    return () => {
      clearInterval(interval)
      if (fadeTimeout) clearTimeout(fadeTimeout)
    }
  }, [prefersReducedMotion])

  const scene = SCENES[sceneIndex]

  return (
    <div className="onboarding-preview">
      <div className={`preview-window ${isFading ? 'is-fading' : ''}`}>
        <div className="preview-search">
          <span className="preview-search-icon">🔍</span>
          <span className="preview-query">{scene.query}</span>
          <span className="preview-caret" aria-hidden="true" />
        </div>
        <div className="preview-results">
          {scene.results.map((item, index) => (
            <div key={`${scene.id}-${index}`} className="preview-item">
              <span className="preview-item-icon">{item.icon}</span>
              <div className="preview-item-text">
                <span className="preview-item-name">{item.name}</span>
                <span className="preview-item-meta">{item.meta}</span>
              </div>
              {item.badge && <span className="preview-item-badge">{item.badge}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="preview-caption">{scene.caption}</div>
    </div>
  )
}

export default OnboardingPreview
