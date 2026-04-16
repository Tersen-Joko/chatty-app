"use client"

import { useEffect, useState } from "react"

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [shouldRender, setShouldRender] = useState(true)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsVisible(false)
    }, 1000)

    const hideTimer = setTimeout(() => {
      setShouldRender(false)
    }, 1500)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <h1 
        className="text-6xl md:text-8xl font-bold gradient-text"
        style={{ fontFamily: "var(--font-outfit), 'Outfit', sans-serif" }}
      >
        chatty
      </h1>
    </div>
  )
}
