"use client"

import type React from "react"
import { useEffect, useState } from "react"

export default function DarkModeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isDark, setIsDark] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = stored ? stored === "dark" : prefersDark
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
  }, [])

  const toggleDarkMode = () => {
    const newValue = !isDark
    setIsDark(newValue)
    localStorage.setItem("theme", newValue ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newValue)
  }

  if (!isMounted) return <>{children}</>

  return (
    <div className="relative min-h-screen">
      {/* Removed duplicate toggle button to avoid conflict with Header component */}
      {children}
    </div>
  )
}
