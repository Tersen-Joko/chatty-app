"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/chatty/app-shell"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Search, Plus, Users, Loader2, LogOut, LogIn } from "lucide-react"

interface Group {
  id: string
  name: string
  description: string | null
  cover_image_url: string | null
  created_by: string
  is_private: boolean
  created_at: string
  member_count?: number
  is_member?: boolean
}

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: "", description: "" })
  const [creating, setCreating] = useState(false)

  const fetchGroups = useCallback(async () => {
    if (!user) return

    // Get groups user is a member of
    const { data: memberData } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)

    const memberGroupIds = memberData?.map(m => m.group_id) || []

    if (memberGroupIds.length > 0) {
      const { data: myGroupsData } = await supabase
        .from("groups")
        .select("*")
        .in("id", memberGroupIds)

      // Get member counts
      const groupsWithCounts = await Promise.all(
        (myGroupsData || []).map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
          return { ...group, member_count: count || 0, is_member: true }
        })
      )

      setMyGroups(groupsWithCounts)
    } else {
      setMyGroups([])
    }

    // Get all public groups for discovery
    const { data: allGroups } = await supabase
      .from("groups")
      .select("*")
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(20)

    const discoverWithCounts = await Promise.all(
      (allGroups || []).map(async (group) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id)
        return { 
          ...group, 
          member_count: count || 0, 
          is_member: memberGroupIds.includes(group.id) 
        }
      })
    )

    setDiscoverGroups(discoverWithCounts.filter(g => !memberGroupIds.includes(g.id)))
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    } else if (user) {
      fetchGroups()
    }
  }, [user, authLoading, router, fetchGroups])

  const createGroup = async () => {
    if (!user || !newGroup.name.trim()) return

    setCreating(true)

    const { data: groupData, error } = await supabase
      .from("groups")
      .insert({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && groupData) {
      // Add creator as admin
      await supabase.from("group_members").insert({
        group_id: groupData.id,
        user_id: user.id,
        role: "admin",
      })

      setNewGroup({ name: "", description: "" })
      setCreateOpen(false)
      fetchGroups()
    }

    setCreating(false)
  }

  const joinGroup = async (groupId: string) => {
    if (!user) return

    await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
    })

    fetchGroups()
  }

  const leaveGroup = async (groupId: string) => {
    if (!user) return

    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id)

    fetchGroups()
  }

  const filteredMyGroups = myGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDiscoverGroups = discoverGroups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (authLoading || !user) {
    return null
  }

  return (
    <AppShell currentPage="groups">
      <main className="flex-1 md:ml-64 lg:mr-72 py-6 px-4 md:px-6 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Groups</h1>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-gradient-to-r from-primary to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Create a New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="groupName">Group Name</FieldLabel>
                      <Input
                        id="groupName"
                        placeholder="Enter group name"
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                        className="rounded-xl"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="groupDesc">Description (optional)</FieldLabel>
                      <Textarea
                        id="groupDesc"
                        placeholder="What is this group about?"
                        value={newGroup.description}
                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                        className="rounded-xl resize-none"
                        rows={3}
                      />
                    </Field>
                  </FieldGroup>
                  <Button
                    onClick={createGroup}
                    disabled={!newGroup.name.trim() || creating}
                    className="w-full rounded-xl"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Group"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <Tabs defaultValue="my-groups" className="w-full">
            <TabsList className="w-full rounded-xl">
              <TabsTrigger value="my-groups" className="flex-1 rounded-xl">
                My Groups ({myGroups.length})
              </TabsTrigger>
              <TabsTrigger value="discover" className="flex-1 rounded-xl">
                Discover
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-groups" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMyGroups.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No groups match your search" : "You haven't joined any groups yet"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredMyGroups.map((group) => (
                    <Card key={group.id} className="rounded-xl overflow-hidden">
                      <div className="h-24 bg-gradient-to-r from-primary/20 to-purple-600/20" />
                      <CardContent className="p-4 -mt-8">
                        <div className="flex items-end justify-between">
                          <div className="flex items-end gap-3">
                            <Avatar className="h-16 w-16 border-4 border-card">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                                {group.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="pb-1">
                              <h3 className="font-semibold text-lg">{group.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => leaveGroup(group.id)}
                            className="rounded-xl"
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Leave
                          </Button>
                        </div>
                        {group.description && (
                          <p className="mt-3 text-sm text-muted-foreground">{group.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="discover" className="mt-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredDiscoverGroups.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery ? "No groups match your search" : "No groups to discover right now"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredDiscoverGroups.map((group) => (
                    <Card key={group.id} className="rounded-xl overflow-hidden">
                      <div className="h-24 bg-gradient-to-r from-primary/20 to-purple-600/20" />
                      <CardContent className="p-4 -mt-8">
                        <div className="flex items-end justify-between">
                          <div className="flex items-end gap-3">
                            <Avatar className="h-16 w-16 border-4 border-card">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                                {group.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="pb-1">
                              <h3 className="font-semibold text-lg">{group.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => joinGroup(group.id)}
                            className="rounded-xl"
                          >
                            <LogIn className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        </div>
                        {group.description && (
                          <p className="mt-3 text-sm text-muted-foreground">{group.description}</p>
                        )}
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
