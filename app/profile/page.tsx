"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, LinkIcon, Trash2, Shield, Github, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [identities, setIdentities] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    setUser(user)
    setIdentities(user.identities || [])

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (profileData) {
      setProfile(profileData)
      setUsername(profileData.username || "")
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id)

      if (error) throw error

      setMessage({ type: "success", text: "Profile updated successfully!" })
      fetchUserData()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccount = async (provider: "google" | "github" | "azure") => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
      })
      if (error) throw error
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    }
  }

  const handleUnlinkAccount = async (identityId: string) => {
    try {
      const { error } = await supabase.auth.unlinkIdentity({
        identity_id: identityId,
      })
      if (error) throw error
      setMessage({ type: "success", text: "Account unlinked successfully!" })
      fetchUserData()
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )
      case "github":
        return <Github className="w-5 h-5" />
      case "azure":
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 24H0V12.6L11.4 24zM23.5 13.8L13.8.5H0v10.1l11.4 11.4h12.1v-8.2zM23.5 24H13.8l9.7-9.7V24z" />
          </svg>
        )
      default:
        return <Mail className="w-5 h-5" />
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "google":
        return "Google"
      case "github":
        return "GitHub"
      case "azure":
        return "Microsoft"
      case "email":
        return "Email"
      default:
        return provider
    }
  }

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) return name.slice(0, 2).toUpperCase()
    if (email) return email.slice(0, 2).toUpperCase()
    return "U"
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Profile Settings
            </h1>
            <p className="text-muted-foreground">Manage your account settings and linked providers</p>
          </div>

          {message && (
            <Alert
              className={
                message.type === "error" ? "border-red-500/50 bg-red-500/10" : "border-green-500/50 bg-green-500/10"
              }
            >
              <AlertDescription
                className={
                  message.type === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Information */}
          <Card className="backdrop-blur-xl border-border/50 bg-card/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-4 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={username || user.email} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-semibold">
                    {getInitials(username, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Profile Picture</p>
                  <p className="text-xs text-muted-foreground mt-1">Synced from your linked accounts</p>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-muted/40 border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user.email} disabled className="bg-muted/20 border-border/30" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Linked Accounts */}
          <Card className="backdrop-blur-xl border-border/50 bg-card/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Linked Accounts
              </CardTitle>
              <CardDescription>Manage your connected authentication providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Identities */}
              <div className="space-y-3">
                {identities.map((identity) => (
                  <div
                    key={identity.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      {getProviderIcon(identity.provider)}
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {getProviderName(identity.provider)}
                          {identity.identity_data?.email === user.email && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{identity.identity_data?.email || "Connected"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      {identities.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkAccount(identity.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Link New Accounts */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Link Additional Accounts</p>
                <div className="grid gap-3">
                  {!identities.some((i) => i.provider === "google") && (
                    <Button
                      variant="outline"
                      onClick={() => handleLinkAccount("google")}
                      className="justify-start border-border/50 hover:bg-muted/50"
                    >
                      {getProviderIcon("google")}
                      <span className="ml-3">Link Google Account</span>
                    </Button>
                  )}
                  {!identities.some((i) => i.provider === "github") && (
                    <Button
                      variant="outline"
                      onClick={() => handleLinkAccount("github")}
                      className="justify-start border-border/50 hover:bg-muted/50"
                    >
                      {getProviderIcon("github")}
                      <span className="ml-3">Link GitHub Account</span>
                    </Button>
                  )}
                  {!identities.some((i) => i.provider === "azure") && (
                    <Button
                      variant="outline"
                      onClick={() => handleLinkAccount("azure")}
                      className="justify-start border-border/50 hover:bg-muted/50"
                    >
                      {getProviderIcon("azure")}
                      <span className="ml-3">Link Microsoft Account</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
