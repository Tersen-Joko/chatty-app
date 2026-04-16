"use client"

import { useState, useRef } from "react"
import { Image as ImageIcon, Video, Smile, X, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface CreatePostProps {
  onPostCreated?: (post: any) => void
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, profile } = useAuth()
  const supabase = createClient()

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() || !user) return

    setLoading(true)

    let imageUrl = null

    // Upload image if present
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, imageFile)

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("posts")
          .getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    // Create post
    const { data, error } = await supabase
      .from("posts")
      .insert({
        content: content.trim(),
        image_url: imageUrl,
        user_id: user.id,
      })
      .select(`
        id,
        content,
        image_url,
        created_at,
        user_id,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        ),
        likes (user_id),
        comments (id)
      `)
      .single()

    if (!error && data) {
      onPostCreated?.(data)
      setContent("")
      setImageFile(null)
      setImagePreview(null)
      setOpen(false)
    }

    setLoading(false)
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-[0_4px_14px_rgba(99,102,241,0.1)] transition-shadow">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {(profile?.full_name || profile?.username || "U").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="flex-1 h-10 px-4 rounded-xl bg-muted text-left text-muted-foreground text-sm hover:bg-accent transition-colors">
              {"What's on your mind?"}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">Create Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {(profile?.full_name || profile?.username || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">{profile?.full_name || profile?.username || "User"}</span>
              </div>
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] resize-none rounded-xl border-none bg-transparent text-base focus-visible:ring-0"
              />
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-xl max-h-[300px] object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full h-8 w-8"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-5 w-5 text-green-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <Smile className="h-5 w-5 text-yellow-500" />
                  </Button>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || loading}
                  className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
        <Button
          variant="ghost"
          className="flex-1 rounded-xl hover:bg-accent gap-2 transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]"
        >
          <Video className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium hidden sm:inline">Live Video</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-xl hover:bg-accent gap-2 transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]"
          onClick={() => setOpen(true)}
        >
          <ImageIcon className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium hidden sm:inline">Photo/Video</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-xl hover:bg-accent gap-2 transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]"
        >
          <Smile className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium hidden sm:inline">Feeling</span>
        </Button>
      </div>
    </div>
  )
}
