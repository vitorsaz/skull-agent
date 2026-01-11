'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SKULL_ASCII = `
                    ██████████████
                ████░░░░░░░░░░░░░░████
              ██░░░░░░░░░░░░░░░░░░░░░░██
            ██░░░░░░░░░░░░░░░░░░░░░░░░░░██
          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
        ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
        ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
      ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
      ██░░░░░░████████░░░░░░░░████████░░░░░░░░██
      ██░░░░██▓▓▓▓▓▓▓▓██░░░░██▓▓▓▓▓▓▓▓██░░░░░░██
      ██░░░░██▓▓████▓▓██░░░░██▓▓████▓▓██░░░░░░██
      ██░░░░██▓▓████▓▓██░░░░██▓▓████▓▓██░░░░░░██
      ██░░░░░░████████░░░░░░░░████████░░░░░░░░██
        ██░░░░░░░░░░░░░░██░░░░░░░░░░░░░░░░░░██
        ██░░░░░░░░░░░░░░██░░░░░░░░░░░░░░░░░░██
          ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██
          ██░░░░██░░░░░░░░░░░░░░░░██░░░░░░██
            ██░░░░████░░░░░░░░████░░░░░░██
              ██░░░░░░████████░░░░░░░░██
                ████░░░░░░░░░░░░░░████
                    ██████████████
`

const SKULL_SMALL = `
    ░██████╗██╗░░██╗██╗░░░██╗██╗░░░░░██╗░░░░░
    ██╔════╝██║░██╔╝██║░░░██║██║░░░░░██║░░░░░
    ╚█████╗░█████═╝░██║░░░██║██║░░░░░██║░░░░░
    ░╚═══██╗██╔═██╗░██║░░░██║██║░░░░░██║░░░░░
    ██████╔╝██║░╚██╗╚██████╔╝███████╗███████╗
    ╚═════╝░╚═╝░░╚═╝░╚═════╝░╚══════╝╚══════╝
`

const LOADING_MESSAGES = [
  'initializing death protocols...',
  'loading skull matrix...',
  'connecting to the void...',
  'awakening the sniper...',
  'scanning pump.fun graveyard...',
  'preparing hunting grounds...',
  'calibrating kill shots...',
  'summoning dark forces...',
  'activating bone radar...',
  'entering the shadows...',
]

const GLITCH_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(0)
  const [glitchText, setGlitchText] = useState('')
  const [showSkull, setShowSkull] = useState(false)

  useEffect(() => {
    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setTimeout(onComplete, 500)
          return 100
        }
        return prev + Math.random() * 3
      })
    }, 100)

    // Messages
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 800)

    // Glitch effect
    const glitchInterval = setInterval(() => {
      const glitch = Array(20).fill(0).map(() =>
        GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      ).join('')
      setGlitchText(glitch)
    }, 50)

    // Show skull after 1s
    setTimeout(() => setShowSkull(true), 500)

    return () => {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
      clearInterval(glitchInterval)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-skull-black z-50 flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Blood drips */}
        <div className="blood-drip" style={{ left: '5%', animationDelay: '0s' }} />
        <div className="blood-drip" style={{ left: '15%', animationDelay: '0.3s' }} />
        <div className="blood-drip" style={{ left: '25%', animationDelay: '0.6s' }} />
        <div className="blood-drip" style={{ left: '35%', animationDelay: '0.9s' }} />
        <div className="blood-drip" style={{ left: '45%', animationDelay: '1.2s' }} />
        <div className="blood-drip" style={{ left: '55%', animationDelay: '1.5s' }} />
        <div className="blood-drip" style={{ left: '65%', animationDelay: '1.8s' }} />
        <div className="blood-drip" style={{ left: '75%', animationDelay: '2.1s' }} />
        <div className="blood-drip" style={{ left: '85%', animationDelay: '2.4s' }} />
        <div className="blood-drip" style={{ left: '95%', animationDelay: '2.7s' }} />

        {/* Scanline */}
        <div className="scanline" />

        {/* Glitch overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: [0, 0.1, 0, 0.05, 0],
            x: [0, -2, 2, -1, 0],
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
        >
          <div className="w-full h-full bg-skull-blood opacity-10" />
        </motion.div>

        {/* Skull ASCII */}
        <AnimatePresence>
          {showSkull && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <pre className="text-skull-green text-xs md:text-sm leading-none skull-glow select-none">
                {SKULL_ASCII}
              </pre>

              {/* Glitch duplicate */}
              <motion.pre
                className="absolute top-0 left-0 text-skull-blood text-xs md:text-sm leading-none opacity-50 select-none"
                animate={{
                  x: [0, -3, 3, -1, 0],
                  opacity: [0.5, 0.3, 0.5, 0.2, 0.5],
                }}
                transition={{ duration: 0.15, repeat: Infinity }}
              >
                {SKULL_ASCII}
              </motion.pre>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SKULL text logo */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <pre className="text-skull-green text-xs md:text-base skull-glow glitch" data-text={SKULL_SMALL}>
            {SKULL_SMALL}
          </pre>
          <motion.p
            className="text-skull-blood text-lg md:text-xl font-bold tracking-[0.5em] mt-2"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            AGENT
          </motion.p>
        </motion.div>

        {/* Loading bar container */}
        <div className="w-80 md:w-96 mt-12">
          {/* Progress bar */}
          <div className="h-2 bg-skull-dark border border-skull-green/30 rounded overflow-hidden">
            <motion.div
              className="h-full loading-bar"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Progress text */}
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-skull-green">{Math.floor(progress)}%</span>
            <motion.span
              className="text-skull-blood"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {glitchText}
            </motion.span>
          </div>

          {/* Loading message */}
          <motion.div
            className="mt-4 text-center"
            key={currentMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-skull-green text-sm">
              {'>'} {LOADING_MESSAGES[currentMessage]}
            </span>
            <motion.span
              className="text-skull-green"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              _
            </motion.span>
          </motion.div>
        </div>

        {/* Bottom decorative skulls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 text-skull-blood/30">
          <span className="text-2xl">&#9760;</span>
          <span className="text-2xl">&#9760;</span>
          <span className="text-2xl">&#9760;</span>
        </div>

        {/* Vignette effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.8) 100%)'
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
}
