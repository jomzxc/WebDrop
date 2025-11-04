import Link from "next/link"
import { Github } from "lucide-react"

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/40 backdrop-blur-xl bg-background/80">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center transition-all group-hover:scale-110">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold">WebDrop</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Secure peer-to-peer file sharing powered by WebRTC. Your files are sent directly, never stored on a central server.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/jomzxc/webdrop" // Placeholder link, update if needed
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  Source Code
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WebDrop. All rights reserved.
          </p>
          <a
            href="https://github.com/jomzxc/webdrop" // Placeholder link, update if needed
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
