import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Zap, Users, Lock, Globe, ArrowRight, CheckCircle2 } from "lucide-react"
import Footer from "@/components/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold">WebDrop</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                Secure P2P File Transfer
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Share files instantly
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                without limits
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Fast, secure file sharing through direct peer-to-peer connections. No servers, no file size limits, just
              direct transfers between you and your peers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth/sign-up">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose WebDrop?</h2>
            <p className="text-muted-foreground text-lg">
              Built with modern web technologies for the best file sharing experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Lightning Fast</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Direct peer-to-peer transfers mean your files move at maximum speed without server bottlenecks.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Secure & Private</h3>
                <p className="text-muted-foreground leading-relaxed">
                  End-to-end encrypted connections ensure your files never touch our servers and remain completely
                  private.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">No Size Limits</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Transfer files of any size without restrictions. Your bandwidth is the only limit.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Room-Based Sharing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Create or join rooms to share files with multiple people simultaneously in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Works Anywhere</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Browser-based solution works on any device with a modern web browser. No installation required.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl border-border/50 bg-card/40 hover:bg-card/60 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Real-Time Progress</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track your file transfers in real-time with detailed progress indicators and status updates.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Get started in three simple steps</p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Create or Join a Room</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Start by creating a new room or joining an existing one with a room code. Share the code with people
                  you want to transfer files with.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Connect with Peers</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Once in a room, you'll see all connected peers. WebRTC establishes secure, direct connections between
                  all participants.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Transfer Files</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Select files to send to any connected peer. Files transfer directly between devices with real-time
                  progress tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="backdrop-blur-xl border-border/50 bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="pt-12 pb-12 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to start sharing?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Join thousands of users who trust WebDrop for fast, secure file transfers
              </p>
              <Link href="/auth/sign-up">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8">
                  Get Started for Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}
