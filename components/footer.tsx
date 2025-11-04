export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/40 backdrop-blur-xl bg-background/80">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold">WebDrop</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Secure peer-to-peer file sharing powered by WebRTC. Your privacy is our priority.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} WebDrop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
