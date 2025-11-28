"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

function SuccessContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-green-700 mb-2">Booking Confirmed!</h1>
      <p className="text-muted-foreground mb-6">Ref: {reference}</p>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
