import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Mulligan | Premier Golf Simulator",
  description: "Book 4-ball games, coaching, and practice sessions at The Mulligan. Top-tier golf simulation technology.",
  icons: {
    icon: "/icon-mulligan.png",
    shortcut: "/icon-mulligan.png",
    apple: "/icon-mulligan.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background antialiased font-sans`}>
        {children}
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
