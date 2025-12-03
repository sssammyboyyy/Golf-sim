"use client"

import { Suspense } from "react"
import BookingConfirmation from "@/components/booking-confirmation"

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <BookingConfirmation />
    </Suspense>
  )
}
