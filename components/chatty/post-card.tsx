"use client"

import { useState } from "react"
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface PostCardProps {
  postId: string
  author: {
    id: string
    name: string
    avatar: string | null
    initials: string
  }
  timestamp: string
  content: string
  image?: string
  likes: number
  comments: number
  shares: number
  isLikedByUser?: boolean
  onLikeChange?: (liked: boolean) => void
  onSave?: (saved: boolean) => void
}

export function PostCard({
  postId,
  author,
  timestamp,
  content,
  image,
  likes,
  comments,
  shares,
  isLikedByUser = false,
  onLikeChange,
  onSave,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(isLikedByUser)
  const [likeCount, setLikeCount] = useState(likes)
  const [isSaved, setIsSaved] = useState(false)

  const handleLike = () => {
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setLikeCount(newLiked ? likeCount + 1 : likeCount - 1)
    onLikeChange?.(newLiked)
  }

  const handleSave = () => {
    const newSaved = !isSaved
    setIsSaved(newSaved)
    onSave?.(newSaved)
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-[0_4px_14px_rgba(99,102,241,0.1)] transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatar || undefined} alt={author.name} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {author.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm text-foreground">{author.name}</h3>
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-accent h-8 w-8"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={handleSave} className="rounded-lg">
              <Bookmark className={cn("mr-2 h-4 w-4", isSaved && "fill-current")} />
              {isSaved ? "Unsave post" : "Save post"}
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg">Hide post</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-destructive">Report post</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <p className="mt-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>

      {/* Image */}
      {image && (
        <div className="mt-3 -mx-4">
          <img
            src={image}
            alt="Post content"
            className="w-full h-auto max-h-[400px] object-cover"
            crossOrigin="anonymous"
          />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
        <span>{likeCount} likes</span>
        <div className="flex gap-3">
          <span>{comments} comments</span>
          <span>{shares} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "flex-1 rounded-xl gap-2 transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]",
            isLiked && "text-secondary"
          )}
          onClick={handleLike}
        >
          <Heart className={cn("h-5 w-5", isLiked && "fill-secondary")} />
          <span className="text-sm font-medium">Like</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-xl gap-2 transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Comment</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-xl gap-2 transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]"
        >
          <Share2 className="h-5 w-5" />
          <span className="text-sm font-medium">Share</span>
        </Button>
      </div>
    </div>
  )
}
