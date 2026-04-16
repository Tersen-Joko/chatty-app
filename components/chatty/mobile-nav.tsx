"use client"

import Link from "next/link"
import { Home, Users, UsersRound, MessageCircle, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  currentPage?: string
}

const navItems = [
  { icon: Home, label: "Feed", href: "/", page: "feed" },
  { icon: Users, label: "Friends", href: "/friends", page: "friends" },
  { icon: UsersRound, label: "Groups", href: "/groups", page: "groups" },
  { icon: MessageCircle, label: "Chat", href: "/messages", page: "messages" },
  { icon: Bookmark, label: "Saved", href: "/saved", page: "saved" },
]

export function MobileNav({ currentPage = "feed" }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
              currentPage === item.page
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", currentPage === item.page && "fill-primary/10")} />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
