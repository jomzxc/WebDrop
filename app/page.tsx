"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Zap, Users, Infinity, ArrowRight, Github } from "lucide-react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user)
      setIsLoading(false)
    })
  }, [supabase])

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/room")
    } else {
      router.push("/auth/login")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://webdrop.jomszxc.tech/#website",
        url: "https://webdrop.jomszxc.tech",
        name: "WebDrop",
        description: "Fast, secure file sharing through direct peer-to-peer connections",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://webdrop.jomszxc.tech/?search={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": "https://webdrop.jomszxc.tech/#webapplication",
        name: "WebDrop",
        url: "https://webdrop.jomszxc.tech",
        description:
          "Fast, secure file sharing through direct peer-to-peer connections. No servers, no limits, just direct transfers.",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "End-to-End Encrypted",
          "Lightning Fast",
          "Real-Time Collaboration",
          "Unlimited Transfers",
          "No file storage on servers",
          "Direct peer-to-peer connections",
        ],
      },
      {
        "@type": "Organization",
        "@id": "https://webdrop.jomszxc.tech/#organization",
        name: "WebDrop",
        url: "https://webdrop.jomszxc.tech",
        logo: {
          "@type": "ImageObject",
          url: "https://webdrop.jomszxc.tech/icon-512.png",
        },
        sameAs: ["https://github.com/jomzxc/WebDrop"],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-32 lg:pt-40 lg:pb-48">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              <span className="block mb-2">Share files instantly.</span>
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                No limits. No storage.
              </span>
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Peer-to-peer file sharing powered by WebRTC. Your files never touch our servers. Fast, secure, and
              private.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 bg-transparent">
                <Link href="https://github.com/jomzxc/WebDrop" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 w-5 h-5" />
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 lg:py-40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">Why WebDrop?</h2>
              <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                Built for privacy, speed, and simplicity. No compromises.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-all">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">End-to-End Encrypted</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Your files are encrypted during transfer. We never see your data.
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-all">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold">Lightning Fast</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Direct peer-to-peer connections mean maximum transfer speeds.
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-all">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Real-Time Collaboration</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Share with multiple people simultaneously in private rooms.
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-all">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-14 h-14 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Infinity className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold">Unlimited Transfers</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Transfer files up to 500MB as many times as you need. No daily limits.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-24 lg:py-40 bg-muted/20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-5xl font-bold mb-6">How It Works</h2>
              <p className="text-lg lg:text-xl text-muted-foreground">Simple, secure file sharing in three steps</p>
            </div>

            <div className="space-y-12">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Create or Join a Room</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Start by creating a new room or joining an existing one with a room code. Rooms are private and
                    secure.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Connect with Peers</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Once in a room, you'll see all connected peers. Direct peer-to-peer connections are established
                    automatically.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Share Files Instantly</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Select files and choose recipients. Files are transferred directly between peers with end-to-end
                    encryption.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 lg:py-40">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-6xl font-bold">Ready to share securely?</h2>
            <p className="text-xl text-muted-foreground">Join thousands of users sharing files the private way.</p>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
