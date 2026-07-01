"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [{ href: "/", label: "Schedule" }] as const

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === "/"

        return (
          <Button
            key={item.href}
            variant={isActive ? "default" : "outline"}
            size="sm"
            nativeButton={false}
            render={<Link href={item.href} />}
            className={cn(!isActive && "text-muted-foreground")}
          >
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}
