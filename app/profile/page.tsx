"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserIdentity } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Mail, LinkIcon, Trash2, Shield, Github, CheckCircle2, Upload, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const router = useRouter()
  const supabase = createClient()

  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchUserData = useCallback(async (forceRefresh = false) => {
    const { data, error } = await supabase.auth.getUser()
    const user = data.user

    if (error || !user) {
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

    setIsPageLoading(false)

    if (forceRefresh) {
      router.refresh()
    }
  }, [supabase, router])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id)

      if (error) throw error

      setMessage({ type: "success", text: "Profile updated successfully!" })
      fetchUserData(true)
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccount = async (provider: "github") => {
    try {
      const { error } = await supabase.auth.linkIdentity({ provider })
      if (error) throw error
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    }
  }

  const handleUnlinkAccount = async (identity: UserIdentity) => {
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity)
      if (error) throw error
      setMessage({ type: "success", text: "Account unlinked successfully!" })
      fetchUserData(true)
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    setMessage(null)

    try {
      const resizedBlob = await resizeImage(file, 150)
      const fileExtension = file.name.split(".").pop() || "png"
      const filePath = `${user.id}.${fileExtension}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, resizedBlob, {
        cacheControl: "3600",
        upsert: true,
      })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      const newAvatarUrl = `${data.publicUrl}?t=${new Date().getTime()}`

      await updateAvatarUrl(newAvatarUrl)
      setMessage({ type: "success", text: "Avatar updated successfully!" })

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to upload avatar" })
    } finally {
      setIsUploading(false)
    }
  }

  const updateAvatarUrl = async (newUrl: string) => {
    if (!user) return
    const { error } = await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id)
    if (error) throw error

    await fetchUserData(true)
  }

  const resizeImage = (file: File, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext("2d")
          if (!ctx) return reject(new Error("Failed to get canvas context"))

          ctx.drawImage(img, 0, 0, size, size)
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Failed to create blob"))
              resolve(blob)
            },
            "image/png",
            0.8,
          )
        }
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "github":
        return <Github className="w-5 h-5" />
      default:
        return <Mail className="w-5 h-5" />
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "github":
        return "GitHub"
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

  if (!user || isPageLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  const currentAvatar = profile?.avatar_url

  return (
    <main className="relative min-h-screen bg-background text-foreground flex flex-col">
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl opacity-20 animate-pulse" />

      <Header />
      <div className="relative z-10 flex-1 container mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto space-y-8">
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

          <Card className="backdrop-blur-xl border-border/50 bg-card/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile Picture
              </CardTitle>
              <CardDescription>Upload your own profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-muted/20 border border-border/50">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={currentAvatar || "/placeholder.svg"} alt={username || user.email} />
                  <AvatarFallback className="text-3xl font-semibold text-white bg-gradient-to-br from-primary to-accent">
                    {getInitials(username, user.email)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">Current Avatar</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base">
                  <Upload className="w-4 h-4" />
                  Upload Profile Picture
                </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image
                      </>
                    )}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    disabled={isUploading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, at least 150x150px. Accepts PNG, JPG, or WebP.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl border-border/50 bg-card/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
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

          <Card className="backdrop-blur-xl border-border/50 bg-card/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Linked Accounts
              </CardTitle>
              <CardDescription>Manage your connected authentication providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          {identity.provider === "email" && (
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
                      {identity.provider !== "email" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkAccount(identity)}
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

              <div className="space-y-3">
                <p className="text-sm font-medium">Link Additional Accounts</p>
                <div className="grid gap-3">
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  )
}
