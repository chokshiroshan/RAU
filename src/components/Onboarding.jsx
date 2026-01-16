import React, { useState, useEffect } from 'react'

const SLIDES = [
    {
        id: 'welcome',
        title: 'Welcome to ContextSearch',
        subtitle: 'Your new superpower for macOS',
        icon: '🚀',
        content: 'A lightning-fast launcher that searches apps, browser tabs, and files from one place.',
    },
    {
        id: 'hotkey',
        title: 'Summon Instantly',
        subtitle: 'Press the magic keys',
        icon: '⌨️',
        content: null,
        hotkey: '⌘ ⇧ Space',
        hotkeyDescription: 'Opens ContextSearch from anywhere',
    },
    {
        id: 'search-types',
        title: 'Search Everything',
        subtitle: 'Apps, Tabs, and Files',
        icon: '🔍',
        features: [
            { icon: '📱', label: 'Applications', desc: 'Launch any installed app' },
            { icon: '🌐', label: 'Browser Tabs', desc: 'Safari, Chrome, Brave, Comet' },
            { icon: '📄', label: 'Files', desc: 'Search by filename instantly' },
        ],
    },
    {
        id: 'power-features',
        title: 'Power Features',
        subtitle: 'Built-in superpowers',
        icon: '⚡',
        features: [
            { icon: '🧮', label: 'Calculator', desc: 'Type "2+2" for instant math' },
            { icon: '🌙', label: 'System Commands', desc: '"sleep", "lock", "empty trash"' },
            { icon: '🔎', label: 'Web Search', desc: '"g query" for Google search' },
        ],
    },
    {
        id: 'ready',
        title: "You're Ready!",
        subtitle: 'Start searching',
        icon: '✨',
        content: 'Press the hotkey to begin your new workflow.',
        hotkey: '⌘ ⇧ Space',
        isFinal: true,
    },
]

function Onboarding({ onComplete }) {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [animating, setAnimating] = useState(false)

    const slide = SLIDES[currentSlide]
    const isFirst = currentSlide === 0
    const isLast = currentSlide === SLIDES.length - 1

    const goToSlide = (index) => {
        if (animating || index === currentSlide) return
        setAnimating(true)
        setCurrentSlide(index)
        setTimeout(() => setAnimating(false), 300)
    }

    const handleNext = () => {
        if (isLast) {
            onComplete()
        } else {
            goToSlide(currentSlide + 1)
        }
    }

    const handleBack = () => {
        if (!isFirst) {
            goToSlide(currentSlide - 1)
        }
    }

    const handleSkip = () => {
        onComplete()
    }

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
    }, [currentSlide])

    return (
        <div className="onboarding-backdrop">
            <div className="onboarding-modal">
                {/* Skip button */}
                <button className="onboarding-skip" onClick={handleSkip}>
                    Skip
                </button>

                {/* Slide content */}
                <div className={`onboarding-slide ${animating ? 'animating' : ''}`}>
                    <div className="onboarding-icon">{slide.icon}</div>
                    <h1 className="onboarding-title">{slide.title}</h1>
                    <p className="onboarding-subtitle">{slide.subtitle}</p>

                    {slide.content && (
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

                    {slide.features && (
                        <div className="onboarding-features">
                            {slide.features.map((feature, i) => (
                                <div key={i} className="onboarding-feature">
                                    <span className="feature-icon">{feature.icon}</span>
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
