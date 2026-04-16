"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/chatty/app-shell"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Search, UserPlus, Check, X, Loader2, UserMinus } from "lucide-react"

interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  profiles: Profile
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [friends, setFriends] = useState<Profile[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  const fetchFriendsData = useCallback(async () => {
    if (!user) return

    // Get accepted friendships
    const { data: acceptedFriendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (acceptedFriendships && acceptedFriendships.length > 0) {
      const friendIds = acceptedFriendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
      
      const { data: friendProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds)
      
      setFriends(friendProfiles || [])
    } else {
      setFriends([])
    }

    // Get pending requests received
    const { data: pendingData } = await supabase
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        profiles:requester_id (id, username, full_name, avatar_url)
      `)
      .eq("addressee_id", user.id)
      .eq("status", "pending")

    setPendingRequests((pendingData as unknown as FriendRequest[]) || [])

    // Get sent requests
    const { data: sentData } = await supabase
      .from("friendships")
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        profiles:addressee_id (id, username, full_name, avatar_url)
      `)
      .eq("requester_id", user.id)
      .eq("status", "pending")

    setSentRequests((sentData as unknown as FriendRequest[]) || [])
    
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    } else if (user) {
      fetchFriendsData()
    }
  }, [user, authLoading, router, fetchFriendsData])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user?.id)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10)

    setSearchResults(data || [])
    setSearching(false)
  }

  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return

    await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: "pending",
    })

    fetchFriendsData()
    setSearchResults(prev => prev.filter(p => p.id !== addresseeId))
  }

  const acceptRequest = async (requestId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", requestId)

    fetchFriendsData()
  }

  const rejectRequest = async (requestId: string) => {
    await supabase.from("friendships").delete().eq("id", requestId)
    fetchFriendsData()
  }

  const removeFriend = async (friendId: string) => {
    if (!user) return

    await supabase
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)

    fetchFriendsData()
  }

  if (authLoading || !user) {
    return null
  }

  return (
    <AppShell currentPage="friends">
      <main className="flex-1 md:ml-64 lg:mr-72 py-6 px-4 md:px-6 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Friends</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for friends..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <Card className="rounded-xl">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Search Results</h3>
                {searching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found</p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((profile) => {
                      const isFriend = friends.some(f => f.id === profile.id)
                      const hasPendingRequest = sentRequests.some(r => r.profiles.id === profile.id)
                      
                      return (
                        <div key={profile.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {(profile.full_name || profile.username || "U").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{profile.full_name || profile.username}</p>
                              <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            </div>
                          </div>
                          {isFriend ? (
                            <span className="text-sm text-muted-foreground">Already friends</span>
                          ) : hasPendingRequest ? (
                            <span className="text-sm text-muted-foreground">Request sent</span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => sendFriendRequest(profile.id)}
                              className="rounded-xl"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="w-full rounded-xl">
              <TabsTrigger value="friends" className="flex-1 rounded-xl">
                Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 rounded-xl">
                Requests ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 rounded-xl">
                Sent ({sentRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : friends.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No friends yet. Search for people to connect with!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {friends.map((friend) => (
                    <Card key={friend.id} className="rounded-xl">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {(friend.full_name || friend.username || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{friend.full_name || friend.username}</p>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFriend(friend.id)}
                          className="rounded-xl"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              {pendingRequests.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No pending friend requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="rounded-xl">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.profiles.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {(request.profiles.full_name || request.profiles.username || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{request.profiles.full_name || request.profiles.username}</p>
                            <p className="text-sm text-muted-foreground">wants to be your friend</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptRequest(request.id)}
                            className="rounded-xl"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectRequest(request.id)}
                            className="rounded-xl"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              {sentRequests.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No sent friend requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sentRequests.map((request) => (
                    <Card key={request.id} className="rounded-xl">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.profiles.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {(request.profiles.full_name || request.profiles.username || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{request.profiles.full_name || request.profiles.username}</p>
                            <p className="text-sm text-muted-foreground">Request pending</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectRequest(request.id)}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppShell>
  )
}
