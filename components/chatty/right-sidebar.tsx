"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

interface Friend {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface RightSidebarProps {
  onOpenChat?: (userId: string, name: string, avatar: string | null) => void
}

export function RightSidebar({ onOpenChat }: RightSidebarProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return

      // Get accepted friendships where user is either requester or addressee
      const { data: friendships } = await supabase
        .from("friendships")
        .select(`
          requester_id,
          addressee_id
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (friendships && friendships.length > 0) {
        // Extract friend IDs (the other person in the friendship)
        const friendIds = friendships.map(f => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        )

        // Get profiles for those friends
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", friendIds)

        if (profiles) {
          setFriends(profiles)
        }
      }
    }

    fetchFriends()
  }, [user, supabase])

  return (
    <aside className="hidden lg:block fixed right-0 top-16 h-[calc(100vh-4rem)] w-72 bg-card border-l border-border p-4 overflow-y-auto">
      <h2 
        className="text-lg font-semibold mb-4 text-foreground"
        style={{ fontFamily: "var(--font-outfit), 'Outfit', sans-serif" }}
      >
        Contacts
      </h2>
      <div className="space-y-1">
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground px-3 py-2">
            Add friends to see them here
          </p>
        ) : (
          friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => onOpenChat?.(friend.id, friend.full_name || friend.username || "User", friend.avatar_url)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent transition-all hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={friend.avatar_url || undefined} alt={friend.full_name || friend.username || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {(friend.full_name || friend.username || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
              </div>
              <span className="font-medium text-sm text-foreground">
                {friend.full_name || friend.username || "User"}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}
