"use client"

import Link from "next/link"
import { Home, Users, UsersRound, Bookmark, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LeftSidebarProps {
  isOpen: boolean
  onClose: () => void
  currentPage?: string
}

const navItems = [
  { icon: Home, label: "Feed", href: "/", page: "feed" },
  { icon: Users, label: "Friends", href: "/friends", page: "friends" },
  { icon: UsersRound, label: "Groups", href: "/groups", page: "groups" },
  { icon: MessageCircle, label: "Messages", href: "/messages", page: "messages" },
  { icon: Bookmark, label: "Saved", href: "/saved", page: "saved" },
]

export function LeftSidebar({ isOpen, onClose, currentPage = "feed" }: LeftSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border p-4 transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex justify-end md:hidden mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-accent"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                currentPage === item.page
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(99,102,241,0.25)]"
                  : "hover:bg-accent hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)] text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
