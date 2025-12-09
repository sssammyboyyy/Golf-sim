"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Trophy, Calendar, DollarSign, Users } from "lucide-react"
import { BookingsTable } from "@/components/admin/bookings-table"
import { AvailabilityManager } from "@/components/admin/availability-manager"
import { RevenueReports } from "@/components/admin/revenue-reports"
import { CompetitionsManager } from "@/components/admin/competitions-manager"

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("bookings")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">Elite Golf Sim</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Today&apos;s Bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">12</p>
                  <p className="text-xs text-muted-foreground">+3 from yesterday</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Today&apos;s Revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">R8,450</p>
                  <p className="text-xs text-muted-foreground">+15% from yesterday</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Players</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">28</p>
                  <p className="text-xs text-muted-foreground">Across 12 sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>This Week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">R42,300</p>
                  <p className="text-xs text-muted-foreground">68 bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="competitions">Competitions</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <BookingsTable />
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityManager />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueReports />
          </TabsContent>

          <TabsContent value="competitions">
            <CompetitionsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
