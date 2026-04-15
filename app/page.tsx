"use client"

import { useAuth } from "../contexts/auth-context"
export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-orange-500 animate-pulse">Loading Chatty...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto bg-card border-2 border-orange-500 rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-orange-600 mb-4">Chatty is Online!</h1>
        <p className="text-foreground mb-6">
          The Orange Theme is now active.
        </p>
        {user ? (
          <p className="text-green-600 font-medium">Logged in as: {user.email}</p>
        ) : (
          <p className="text-red-500">Please check back once components are synced.</p>
        )}
      </div>
    </div>
  )
}
