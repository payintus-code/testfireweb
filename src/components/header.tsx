"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UsersRound, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { ShuttlecockIcon } from "./icons/shuttlecock-icon";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/players", label: "Players", icon: UsersRound },
];

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <ShuttlecockIcon className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              ShuttleScore
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <ShuttlecockIcon className="h-6 w-6 text-primary" />
            <span className="font-bold">ShuttleScore</span>
          </Link>
          <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="px-2 text-base">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <nav className="mt-8 grid-flow-row auto-rows-max text-sm">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                        "flex w-full items-center rounded-md p-3 text-sm font-medium hover:bg-accent",
                        pathname === link.href ? "bg-accent" : ""
                    )}
                  >
                    <link.icon className="mr-3 h-5 w-5" /> {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
