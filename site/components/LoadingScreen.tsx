'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SKULL_LOGO_URL = 'https://media.discordapp.net/attachments/1454587961642582039/1459762883562049639/image.png?ex=696475a0&is=69632420&hm=522e0130286a30691dd624369482c5103266686216d3c0945843f54b54de43a4&=&format=webp&quality=lossless'

const LOADING_MESSAGES = [
  'initializing protocols...',
  'connecting to darkweb...',
  'loading skull matrix...',
  'establishing secure tunnel...',
  'scanning pump.fun...',
  'calibrating sniper...',
  'entering the void...',
  'awakening the hunter...',
]

interface LoadingScreenProps {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(0)
  const [showLogo, setShowLogo] = useState(false)

  useEffect(() => {
    setTimeout(() => setShowLogo(true), 300)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setTimeout(onComplete, 300)
          return 100
        }
        return prev + Math.random() * 4
      })
    }, 80)

    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 600)

    return () => {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-void z-50 flex flex-col items-center justify-center overflow-hidden noise"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Subtle blood drips */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="blood-drip"
            style={{ left: `${15 + i * 15}%`, animationDelay: `${i * 0.5}s` }}
          />
        ))}

        {/* Scanline */}
        <div className="scanline" />

        {/* Vignette */}
        <div className="vignette" />

        {/* Logo */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <img
                src={SKULL_LOGO_URL}
                alt="SKULL AGENT"
                className="w-32 h-32 md:w-48 md:h-48 rounded-xl opacity-90"
              />

              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  boxShadow: '0 0 60px rgba(139, 0, 0, 0.3)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold text-skull-text-bright tracking-wider">
            SKULL AGENT
          </h1>
          <p className="text-skull-blood text-sm md:text-base tracking-[0.4em] mt-2">
            AUTONOMOUS SNIPER
          </p>
        </motion.div>

        {/* Loading bar */}
        <div className="w-64 md:w-80 mt-12">
          <div className="h-1 bg-skull-border rounded overflow-hidden">
            <motion.div
              className="h-full bg-skull-blood"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="flex justify-between mt-2 text-[10px]">
            <span className="text-skull-text-dim">{Math.floor(progress)}%</span>
            <span className="text-skull-blood">LOADING</span>
          </div>

          {/* Loading message */}
          <motion.div
            className="mt-4 text-center"
            key={currentMessage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-skull-text-dim text-xs">
              {LOADING_MESSAGES[currentMessage]}
            </span>
            <motion.span
              className="text-skull-blood ml-1"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              _
            </motion.span>
          </motion.div>
        </div>

        {/* Bottom text */}
        <div className="absolute bottom-6 text-center">
          <p className="text-skull-text-dim text-[10px] tracking-wider">
            darkweb edition
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
