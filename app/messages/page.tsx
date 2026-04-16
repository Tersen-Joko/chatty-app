"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/chatty/app-shell"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChatPanel } from "@/components/chatty/chat-panel"
import { Search, MessageCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  otherUser: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
  }
  unreadCount: number
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<{
    id: string
    name: string
    avatar: string | null
  } | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!user) return

    // Get all messages involving the user
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (!messages || messages.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    // Group by conversation partner
    const conversationMap = new Map<string, { lastMessage: any; unreadCount: number }>()
    
    messages.forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          lastMessage: msg,
          unreadCount: 0,
        })
      }
      
      if (!msg.read && msg.receiver_id === user.id) {
        const conv = conversationMap.get(partnerId)!
        conv.unreadCount++
      }
    })

    // Get profiles for conversation partners
    const partnerIds = Array.from(conversationMap.keys())
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", partnerIds)

    const conversationList: Conversation[] = partnerIds.map((partnerId) => {
      const conv = conversationMap.get(partnerId)!
      const profile = profiles?.find((p) => p.id === partnerId)
      
      return {
        id: partnerId,
        otherUser: profile || {
          id: partnerId,
          username: null,
          full_name: "Unknown User",
          avatar_url: null,
        },
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
      }
    })

    // Sort by last message time
    conversationList.sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    )

    setConversations(conversationList)
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    } else if (user) {
      fetchConversations()
    }
  }, [user, authLoading, router, fetchConversations])

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchConversations])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Just now"
    if (hours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    if (days === 1) return "Yesterday"
    return date.toLocaleDateString()
  }

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.otherUser.full_name || conv.otherUser.username || ""
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (authLoading || !user) {
    return null
  }

  return (
    <AppShell currentPage="messages">
      <main className="flex-1 md:ml-64 lg:mr-72 py-6 px-4 md:px-6 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Messages</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No conversations match your search"
                    : "No messages yet. Start a conversation with a friend!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() =>
                    setSelectedChat({
                      id: conv.otherUser.id,
                      name: conv.otherUser.full_name || conv.otherUser.username || "User",
                      avatar: conv.otherUser.avatar_url,
                    })
                  }
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.1)]",
                    conv.unreadCount > 0 && "bg-primary/5 border-primary/20"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.otherUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(conv.otherUser.full_name || conv.otherUser.username || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={cn(
                        "font-semibold truncate",
                        conv.unreadCount > 0 && "text-primary"
                      )}>
                        {conv.otherUser.full_name || conv.otherUser.username || "User"}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {conv.lastMessage.sender_id === user.id && "You: "}
                        {conv.lastMessage.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedChat && (
        <ChatPanel
          receiverId={selectedChat.id}
          receiverName={selectedChat.name}
          receiverAvatar={selectedChat.avatar}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </AppShell>
  )
}
