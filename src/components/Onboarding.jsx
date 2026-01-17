import React, { useState, useEffect, useCallback } from 'react'
import { ipcRenderer } from '../services/electron'
import {
  IconRocket,
  IconKeyboard,
  IconSearch,
  IconLightning,
  IconCheck,
  IconSparkles,
  IconPhone,
  IconGlobe,
  IconFile,
  IconCalculator,
  IconMoon,
  IconSearchWeb,
} from './OnboardingIcons'

const SLIDES = [
    {
        id: 'welcome',
        title: 'Welcome to ContextSearch',
        subtitle: 'Your new superpower for macOS',
        icon: <IconRocket />,
        content: 'A lightning-fast launcher that searches apps, browser tabs, and files from one place.',
    },
    {
        id: 'hotkey',
        title: 'Summon Instantly',
        subtitle: 'Press the magic keys',
        icon: <IconKeyboard />,
        content: null,
        hotkey: '⌘ ⇧ Space',
        hotkeyDescription: 'Opens ContextSearch from anywhere',
    },
    {
        id: 'search-types',
        title: 'Search Everything',
        subtitle: 'Apps, Tabs, and Files',
        icon: <IconSearch />,
        features: [
            { icon: <IconPhone />, label: 'Applications', desc: 'Launch any installed app' },
            { icon: <IconGlobe />, label: 'Browser Tabs', desc: 'Safari, Chrome, Brave, Comet' },
            { icon: <IconFile />, label: 'Files', desc: 'Search by filename instantly' },
        ],
    },
    {
        id: 'power-features',
        title: 'Power Features',
        subtitle: 'Built-in superpowers',
        icon: <IconLightning />,
        features: [
            { icon: <IconCalculator />, label: 'Calculator', desc: 'Type "2+2" for instant math' },
            { icon: <IconMoon />, label: 'System Commands', desc: '"sleep", "lock", "empty trash"' },
            { icon: <IconSearchWeb />, label: 'Web Search', desc: '"g query" for Google search' },
        ],
    },
    {
        id: 'app-selection',
        title: 'Choose Your Apps',
        subtitle: 'Select which apps to include',
        icon: <IconCheck />,
        content: null,
    },
    {
        id: 'ready',
        title: "You're Ready!",
        subtitle: 'Start searching',
        icon: <IconSparkles />,
        content: 'Press the hotkey to begin your new workflow.',
        hotkey: '⌘ ⇧ Space',
        isFinal: true,
    },
]

function Onboarding({ onComplete }) {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [animating, setAnimating] = useState(false)
    const [apps, setApps] = useState([])
    const [selectedApps, setSelectedApps] = useState([])
    const [appFilter, setAppFilter] = useState('')
    const [isLoadingApps, setIsLoadingApps] = useState(false)

    const slide = SLIDES[currentSlide]
    const isFirst = currentSlide === 0
    const isLast = currentSlide === SLIDES.length - 1

    const goToSlide = (index) => {
        if (index === currentSlide) return
        setAnimating(true)
        setCurrentSlide(index)
        setTimeout(() => setAnimating(false), 150)
    }

    const persistSelection = useCallback(async () => {
        if (!ipcRenderer) return
        try {
            const settings = await ipcRenderer.invoke('get-settings')
            const selectedToSave = selectedApps.length === apps.length ? [] : selectedApps
            await ipcRenderer.invoke('save-settings', {
                ...settings,
                selectedApps: selectedToSave,
                onboardingComplete: true,
            })
        } catch (error) {
            console.error('[Onboarding] Failed to save settings:', error)
        }
    }, [apps.length, selectedApps])

    const handleFinish = useCallback(async () => {
        await persistSelection()
        onComplete()
    }, [onComplete, persistSelection])

    const handleNext = useCallback(() => {
        if (isLast) {
            handleFinish()
        } else {
            goToSlide(currentSlide + 1)
        }
    }, [currentSlide, handleFinish, isLast])

    const handleBack = useCallback(() => {
        if (!isFirst) {
            goToSlide(currentSlide - 1)
        }
    }, [currentSlide, isFirst])

    const handleSkip = useCallback(() => {
        handleFinish()
    }, [handleFinish])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter') {
                handleNext()
            } else if (e.key === 'ArrowLeft') {
                handleBack()
            } else if (e.key === 'Escape') {
                handleSkip()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleBack, handleNext, handleSkip])

    useEffect(() => {
        let isCancelled = false

        const loadApps = async () => {
            if (!ipcRenderer) return
            setIsLoadingApps(true)
            try {
                const appResults = await ipcRenderer.invoke('get-apps')
                if (isCancelled) return
                const appNames = appResults
                    .map(app => app.name)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b))
                setApps(appNames)
                setSelectedApps(appNames)
            } catch (error) {
                console.error('[Onboarding] Failed to load apps:', error)
            } finally {
                if (!isCancelled) setIsLoadingApps(false)
            }
        }

        loadApps()

        return () => {
            isCancelled = true
        }
    }, [])

    const toggleApp = useCallback((appName) => {
        setSelectedApps(prev => (
            prev.includes(appName)
                ? prev.filter(name => name !== appName)
                : [...prev, appName]
        ))
    }, [])

    const selectAllApps = useCallback(() => {
        setSelectedApps(apps)
    }, [apps])

    const clearAllApps = useCallback(() => {
        setSelectedApps([])
    }, [])

    const filteredApps = apps.filter(appName =>
        appName.toLowerCase().includes(appFilter.trim().toLowerCase())
    )

    return (
        <div className="onboarding-backdrop">
            <div className="onboarding-modal">
                {/* Skip button */}
                <button className="onboarding-skip" onClick={handleSkip}>
                    Skip
                </button>

                {/* Slide content */}
                <div className={`onboarding-slide ${animating ? 'animating' : ''}`}>
                    <div className="onboarding-icon" style={{ color: 'var(--accent)' }}>{slide.icon}</div>
                    <h1 className="onboarding-title">{slide.title}</h1>
                    <p className="onboarding-subtitle">{slide.subtitle}</p>

                    {slide.id === 'app-selection' && (
                        <div className="onboarding-apps">
                            <div className="onboarding-apps-toolbar">
                                <input
                                    className="onboarding-apps-filter"
                                    type="text"
                                    value={appFilter}
                                    onChange={(e) => setAppFilter(e.target.value)}
                                    placeholder="Filter apps"
                                />
                                <button
                                    className="onboarding-apps-btn"
                                    onClick={selectAllApps}
                                >
                                    Select all
                                </button>
                                <button
                                    className="onboarding-apps-btn secondary"
                                    onClick={clearAllApps}
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="onboarding-apps-list">
                                {!ipcRenderer && (
                                    <div className="onboarding-apps-empty">
                                        App selection is unavailable outside Electron.
                                    </div>
                                )}
                                {ipcRenderer && isLoadingApps && (
                                    <div className="onboarding-apps-loading">
                                        Loading apps...
                                    </div>
                                )}
                                {ipcRenderer && !isLoadingApps && filteredApps.length === 0 && (
                                    <div className="onboarding-apps-empty">
                                        No apps match your filter.
                                    </div>
                                )}
                                {ipcRenderer && !isLoadingApps && filteredApps.map(appName => (
                                    <label key={appName} className="onboarding-apps-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedApps.includes(appName)}
                                            onChange={() => toggleApp(appName)}
                                        />
                                        <span className="onboarding-apps-name">{appName}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="onboarding-apps-hint">
                                We will show tabs and windows only for selected apps.
                            </div>
                        </div>
                    )}

                    {slide.content && slide.id !== 'app-selection' && (
                        <p className="onboarding-content">{slide.content}</p>
                    )}

                    {slide.hotkey && (
                        <div className="onboarding-hotkey">
                            <span className="hotkey-keys">{slide.hotkey}</span>
                            {slide.hotkeyDescription && (
                                <span className="hotkey-desc">{slide.hotkeyDescription}</span>
                            )}
                        </div>
                    )}

                    {slide.features && slide.id !== 'app-selection' && (
                        <div className="onboarding-features">
                            {slide.features.map((feature, i) => (
                                <div key={i} className="onboarding-feature">
                                    <span className="feature-icon" style={{ color: 'var(--accent)' }}>{feature.icon}</span>
                                    <div className="feature-text">
                                        <span className="feature-label">{feature.label}</span>
                                        <span className="feature-desc">{feature.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Navigation dots */}
                <div className="onboarding-dots">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            className={`onboarding-dot ${i === currentSlide ? 'active' : ''}`}
                            onClick={() => goToSlide(i)}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>

                {/* Navigation buttons */}
                <div className="onboarding-nav">
                    <button
                        className="onboarding-btn secondary"
                        onClick={handleBack}
                        disabled={isFirst}
                    >
                        Back
                    </button>
                    <button
                        className="onboarding-btn primary"
                        onClick={handleNext}
                    >
                        {isLast ? 'Get Started' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Onboarding
