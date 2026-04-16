"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { CreatePost } from "./create-post"
import { PostCard } from "./post-card"
import { Loader2 } from "lucide-react"

interface Post {
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

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
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
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setPosts(data as Post[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleNewPost = (newPost: Post) => {
    setPosts([newPost, ...posts])
  }

  const handleLikeChange = async (postId: string, liked: boolean) => {
    if (!user) return

    if (liked) {
      await supabase.from("likes").insert({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)
    }
    
    // Refresh posts to get updated like counts
    fetchPosts()
  }

  const handleSavePost = async (postId: string, saved: boolean) => {
    if (!user) return

    if (saved) {
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id })
    } else {
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id)
    }
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

  return (
    <main className="flex-1 md:ml-64 lg:mr-72 py-6 px-4 md:px-6 min-h-screen">
      <div className="max-w-2xl mx-auto space-y-4">
        <CreatePost onPostCreated={handleNewPost} />
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              postId={post.id}
              author={{
                id: post.profiles.id,
                name: post.profiles.full_name || post.profiles.username || "Anonymous",
                avatar: post.profiles.avatar_url,
                initials: (post.profiles.full_name || post.profiles.username || "A").slice(0, 2).toUpperCase(),
              }}
              timestamp={formatTimestamp(post.created_at)}
              content={post.content}
              image={post.image_url || undefined}
              likes={post.likes?.length || 0}
              comments={post.comments?.length || 0}
              shares={0}
              isLikedByUser={post.likes?.some(l => l.user_id === user?.id) || false}
              onLikeChange={(liked) => handleLikeChange(post.id, liked)}
              onSave={(saved) => handleSavePost(post.id, saved)}
            />
          ))
        )}
      </div>
    </main>
  )
}
