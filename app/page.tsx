"use client"

import { useAuth } from "@/contexts/auth-context"
import { AppShell } from "@/components/chatty/app-shell"
import { LoginForm } from "@/components/chatty/login-form"

export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary">Welcome to Chatty</h1>
        {/* Your feed content goes here */}
      </div>
    </AppShell>
  )
}
