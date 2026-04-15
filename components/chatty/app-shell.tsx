"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { SplashScreen } from "./splash-screen"
import { Header } from "./header"
import { LeftSidebar } from "./left-sidebar"
import { RightSidebar } from "./right-sidebar"
import { MobileNav } from "./mobile-nav"
import { ChatPanel } from "./chat-panel"

interface AppShellProps {
  children: React.ReactNode
  currentPage?: string
}

export function AppShell({ children, currentPage = "feed" }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedChatUser, setSelectedChatUser] = useState<{
    id: string
    name: string
    avatar: string | null
  } | null>(null)
  const { user, loading } = useAuth()

  const handleOpenChat = (userId: string, name: string, avatar: string | null) => {
    setSelectedChatUser({ id: userId, name, avatar })
    setChatOpen(true)
  }

  if (loading) {
    return <SplashScreen />
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <SplashScreen />
      <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="pt-0 pb-16 md:pb-0">
        <LeftSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          currentPage={currentPage}
        />
        <RightSidebar onOpenChat={handleOpenChat} />
        {children}
      </div>
      <MobileNav currentPage={currentPage} />
      
      {chatOpen && selectedChatUser && (
        <ChatPanel
          receiverId={selectedChatUser.id}
          receiverName={selectedChatUser.name}
          receiverAvatar={selectedChatUser.avatar}
          onClose={() => {
            setChatOpen(false)
            setSelectedChatUser(null)
          }}
        />
      )}
    </div>
  )
}
