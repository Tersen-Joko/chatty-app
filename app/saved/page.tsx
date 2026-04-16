"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/chatty/app-shell"
import { createClient } from "@/lib/supabase/client"
import { PostCard } from "@/components/chatty/post-card"
import { Card, CardContent } from "@/components/ui/card"
import { Bookmark, Loader2 } from "lucide-react"

interface SavedPost {
  id: string
  post_id: string
  posts: {
    id: string
    content: string
    image_url: string | null
    created_at: string
    user_id: string
    profiles: {
      id: string
      username: string | null
      full_name: string | null
      avatar_url: string | null
    }
    likes: { user_id: string }[]
    comments: { id: string }[]
  }
}

export default function SavedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSavedPosts = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from("saved_posts")
      .select(`
        id,
        post_id,
        posts (
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
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setSavedPosts(data as unknown as SavedPost[])
    }
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    } else if (user) {
      fetchSavedPosts()
    }
  }, [user, authLoading, router, fetchSavedPosts])

  const handleUnsave = async (postId: string) => {
    if (!user) return

    await supabase
      .from("saved_posts")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id)

    setSavedPosts(prev => prev.filter(sp => sp.post_id !== postId))
  }

  const handleLikeChange = async (postId: string, liked: boolean) => {
    if (!user) return

    if (liked) {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)
    }
    
    fetchSavedPosts()
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  }

  if (authLoading || !user) {
    return null
  }

  return (
    <AppShell currentPage="saved">
      <main className="flex-1 md:ml-64 lg:mr-72 py-6 px-4 md:px-6 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Saved Posts</h1>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savedPosts.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="p-8 text-center">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {"You haven't saved any posts yet. Save posts to view them here later!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {savedPosts.map((saved) => (
                <PostCard
                  key={saved.id}
                  postId={saved.posts.id}
                  author={{
                    id: saved.posts.profiles.id,
                    name: saved.posts.profiles.full_name || saved.posts.profiles.username || "Anonymous",
                    avatar: saved.posts.profiles.avatar_url,
                    initials: (saved.posts.profiles.full_name || saved.posts.profiles.username || "A").slice(0, 2).toUpperCase(),
                  }}
                  timestamp={formatTimestamp(saved.posts.created_at)}
                  content={saved.posts.content}
                  image={saved.posts.image_url || undefined}
                  likes={saved.posts.likes?.length || 0}
                  comments={saved.posts.comments?.length || 0}
                  shares={0}
                  isLikedByUser={saved.posts.likes?.some(l => l.user_id === user?.id) || false}
                  onLikeChange={(liked) => handleLikeChange(saved.posts.id, liked)}
                  onSave={(isSaved) => {
                    if (!isSaved) {
                      handleUnsave(saved.posts.id)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
