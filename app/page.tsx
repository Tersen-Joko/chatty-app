se client"

import { useAuth } from "@/contexts/auth-context"
import { AppShell } from "@/components/chatty/app-shell"
import { Feed } from "@/components/chatty/feed"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ChattyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return null
  }

  return (
    <AppShell currentPage="feed">
      <Feed />
    </AppShell>
  )
}
