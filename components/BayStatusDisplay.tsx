"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Circle } from "lucide-react"

type BayStatus = "available" | "occupied" | "reserved"

interface Bay {
  id: number
  status: BayStatus
  name: string
}

export default function BayStatusDisplay() {
  const [bays, setBays] = useState<Bay[]>([
    { id: 1, status: "available", name: "Bay 1" },
    { id: 2, status: "available", name: "Bay 2" },
    { id: 3, status: "available", name: "Bay 3" },
  ])

  // In production, this would fetch from API
  useEffect(() => {
    const fetchBayStatus = async () => {
      try {
        const response = await fetch("/api/bays/status")
        if (response.ok) {
          const data = await response.json()
          setBays(data.bays)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch bay status:", error)
      }
    }

    fetchBayStatus()
    // Refresh every 30 seconds
    const interval = setInterval(fetchBayStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const availableCount = bays.filter((bay) => bay.status === "available").length

  const getStatusColor = (status: BayStatus) => {
    switch (status) {
      case "available":
        return "text-green-500"
      case "occupied":
        return "text-red-500"
      case "reserved":
        return "text-amber-500"
      default:
        return "text-gray-500"
    }
  }

  const getCounterColor = () => {
    if (availableCount === 3) return "bg-green-500 text-white"
    if (availableCount >= 1) return "bg-amber-500 text-white"
    return "bg-red-500 text-white"
  }

  return (
    <Card className="border-2 border-primary">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${getCounterColor()} text-xl md:text-2xl font-bold mb-4`}
          >
            <Circle className="w-5 h-5 fill-current" />
            <span>
              {availableCount} BAY{availableCount !== 1 ? "S" : ""} AVAILABLE NOW
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Real-time availability • Updated every 30 seconds</p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {bays.map((bay) => (
            <div
              key={bay.id}
              className="flex flex-col items-center p-4 border-2 rounded-lg transition-all"
              style={{
                borderColor:
                  bay.status === "available"
                    ? "rgb(34 197 94)"
                    : bay.status === "occupied"
                      ? "rgb(239 68 68)"
                      : "rgb(251 191 36)",
                backgroundColor:
                  bay.status === "available"
                    ? "rgb(34 197 94 / 0.1)"
                    : bay.status === "occupied"
                      ? "rgb(239 68 68 / 0.1)"
                      : "rgb(251 191 36 / 0.1)",
              }}
            >
              <Circle className={`w-8 h-8 mb-2 fill-current ${getStatusColor(bay.status)}`} />
              <p className="font-semibold text-foreground mb-1">{bay.name}</p>
              <Badge className="capitalize text-xs" variant={bay.status === "available" ? "default" : "secondary"}>
                {bay.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
