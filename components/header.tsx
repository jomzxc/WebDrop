"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"

export default function Header() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)

    const handleStorageChange = () => {
      const stored = localStorage.getItem("theme")
      const newDarkMode = stored === "dark"
      setIsDark(newDarkMode)
      document.documentElement.classList.toggle("dark", newDarkMode)
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const toggleDarkMode = () => {
    if (mounted) {
      const html = document.documentElement
      const newIsDark = !isDark
      html.classList.toggle("dark", newIsDark)
      setIsDark(newIsDark)
      localStorage.setItem("theme", newIsDark ? "dark" : "light")
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
      <div className="container mx-auto px-4 lg:px-8 py-4 lg:py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                WebDrop
              </h1>
              <p className="text-xs text-muted-foreground">Direct peer-to-peer file transfer</p>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-lg hover:bg-muted transition-colors border border-border/40 text-muted-foreground hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {mounted && isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  )
}
