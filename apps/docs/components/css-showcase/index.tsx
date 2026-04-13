import React, { useState, useCallback, useRef } from 'react'
import styles from './styles.module.css'

// ----- Appearance classes -----
interface AppearanceDef {
  css: string
  bg: string
  color: string
  border: string
}

const APPEARANCES: AppearanceDef[] = [
  { css: 'success-state', bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
  { css: 'warning-state', bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
  { css: 'error-state', bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
  { css: 'success-border', bg: 'transparent', color: 'inherit', border: '#c3e6cb' },
  { css: 'warning-border', bg: 'transparent', color: 'inherit', border: '#ffeeba' },
  { css: 'error-border', bg: 'transparent', color: 'inherit', border: '#f5c6cb' },
]

// ----- Animation classes -----
const ANIMATIONS = [
  'bounce',
  'flash',
  'pulse',
  'rubberBand',
  'shakeX',
  'shakeY',
  'headShake',
  'swing',
  'tada',
  'wobble',
  'jello',
  'heartBeat',
  'backInDown',
  'backInLeft',
  'backInRight',
  'backInUp',
  'backOutDown',
  'backOutLeft',
  'backOutRight',
  'backOutUp',
  'bounceIn',
  'bounceInDown',
  'bounceInLeft',
  'bounceInRight',
  'bounceInUp',
  'bounceOut',
  'bounceOutDown',
  'bounceOutLeft',
  'bounceOutRight',
  'bounceOutUp',
  'fadeIn',
  'fadeInDown',
  'fadeInDownBig',
  'fadeInLeft',
  'fadeInLeftBig',
  'fadeInRight',
  'fadeInRightBig',
  'fadeInUp',
  'fadeInUpBig',
  'fadeInTopLeft',
  'fadeInTopRight',
  'fadeInBottomLeft',
  'fadeInBottomRight',
  'fadeOut',
  'fadeOutDown',
  'fadeOutDownBig',
  'fadeOutLeft',
  'fadeOutLeftBig',
  'fadeOutRight',
  'fadeOutRightBig',
  'fadeOutUp',
  'fadeOutUpBig',
  'fadeOutTopLeft',
  'fadeOutTopRight',
  'fadeOutBottomRight',
  'fadeOutBottomLeft',
  'flip',
  'flipInX',
  'flipInY',
  'flipOutX',
  'flipOutY',
  'lightSpeedInRight',
  'lightSpeedInLeft',
  'lightSpeedOutRight',
  'lightSpeedOutLeft',
  'rotateIn',
  'rotateInDownLeft',
  'rotateInDownRight',
  'rotateInUpLeft',
  'rotateInUpRight',
  'rotateOut',
  'rotateOutDownLeft',
  'rotateOutDownRight',
  'rotateOutUpLeft',
  'rotateOutUpRight',
  'hinge',
  'jackInTheBox',
  'rollIn',
  'rollOut',
  'zoomIn',
  'zoomInDown',
  'zoomInLeft',
  'zoomInRight',
  'zoomInUp',
  'zoomOut',
  'zoomOutDown',
  'zoomOutLeft',
  'zoomOutRight',
  'zoomOutUp',
  'slideInDown',
  'slideInLeft',
  'slideInRight',
  'slideInUp',
  'slideOutDown',
  'slideOutLeft',
  'slideOutRight',
  'slideOutUp',
]

const SPEED_OPTIONS = [
  { label: 'normal', modifier: '' },
  { label: 'fast', modifier: 'fast' },
  { label: 'faster', modifier: 'faster' },
  { label: 'slow', modifier: 'slow' },
  { label: 'slower', modifier: 'slower' },
]

// ----- Helpers -----
function buildCopiedValue(appearance: string, animation: string, speed: string): string {
  const parts = [appearance, 'animated', `${animation}`]
  if (speed) parts.splice(3, 0, speed)
  return parts.join(' ')
}

// ----- Toast -----
function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  const show = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2000)
  }, [])

  return { message, show }
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator?.clipboard) {
    await navigator.clipboard.writeText(text)
  } else {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

// ----- Appearance Showcase -----
function AppearanceShowcase() {
  const { message, show } = useToast()

  function handleClick(a: AppearanceDef) {
    copyToClipboard(a.css).then(() => show(`"${a.css}" copié !`))
  }

  return (
    <div className={styles.section}>
      <div className={styles.grid}>
        {APPEARANCES.map((a) => (
          <div
            key={a.css}
            className={styles.box}
            title="Cliquer pour copier"
            style={{
              backgroundColor: a.bg,
              borderColor: a.border,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
            onClick={() => handleClick(a)}
          >
            <span className={styles.boxLabel} style={{ color: a.color }}>
              {a.css}
            </span>
          </div>
        ))}
      </div>
      {message && <div className={styles.toast}>{message}</div>}
    </div>
  )
}

// ----- Animation Showcase -----
function AnimationShowcase() {
  const [lastClicked, setLastClicked] = useState<string | null>(null)
  const [playing, setPlaying] = useState<{ anim: string; key: number } | null>(null)
  const [activeSpeed, setActiveSpeed] = useState('')
  const { message, show } = useToast()
  const clickTimerRef = useRef<{ anim: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  function triggerAnimation(anim: string) {
    setLastClicked(anim)
    setPlaying((prev) => ({
      anim,
      key: prev?.anim === anim ? prev.key + 1 : 0,
    }))
  }

  function handleClick(anim: string) {
    if (clickTimerRef.current) {
      // Second click within delay → double click: cancel single-click timer and copy
      clearTimeout(clickTimerRef.current.timer)
      clickTimerRef.current = null
      triggerAnimation(anim)
      const value = buildCopiedValue('', anim, activeSpeed).trim()
      copyToClipboard(value).then(() => show(`"${anim}" copié !`))
    } else {
      // First click: wait to distinguish single vs double
      const timer = setTimeout(() => {
        clickTimerRef.current = null
        triggerAnimation(anim)
      }, 250)
      clickTimerRef.current = { anim, timer }
    }
  }

  function handleAnimationEnd(anim: string) {
    if (playing?.anim === anim) {
      setPlaying(null)
    }
  }

  return (
    <div className={styles.section}>
      <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
        <strong>Clic</strong> pour prévisualiser · <strong>Double-clic</strong> pour copier la classe CSS.
      </p>
      <div className={styles.speedButtons}>
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s.label}
            className={`${styles.speedBtn} ${activeSpeed === s.modifier ? styles.speedBtnActive : ''}`}
            onClick={() => setActiveSpeed(s.modifier)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className={styles.animGrid}>
        {ANIMATIONS.map((anim) => {
          const isPlaying = playing?.anim === anim
          const animClass = [
            styles.animBox,
            anim === lastClicked ? styles.activeAnimBox : '',
            isPlaying ? `animate__animated animate__${anim} animate__${activeSpeed}` : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={`${anim}-${playing?.anim === anim ? playing.key : 'idle'}`}
              className={animClass}
              title="Clic : aperçu — Double-clic : copier"
              onClick={() => handleClick(anim)}
              onAnimationEnd={() => handleAnimationEnd(anim)}
            >
              <span className={styles.animLabel}>{anim}</span>
            </div>
          )
        })}
      </div>
      {message && <div className={styles.toast}>{message}</div>}
    </div>
  )
}

// ----- Combined Showcase -----
export function CssAppearanceShowcase() {
  return <AppearanceShowcase />
}

export function CssAnimationShowcase() {
  return <AnimationShowcase />
}
