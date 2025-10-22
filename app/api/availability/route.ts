/**
 * Availability API Endpoint
 * GET /api/availability?date=YYYY-MM-DD&userType=adult
 *
 * Returns available time slots for a specific date with:
 * - Real-time availability (spots remaining)
 * - Dynamic pricing based on user type
 * - Peak/off-peak indicators
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDayType, isDateHoliday, parseTimeToHour } from '@/lib/pricing'
import type { DayType } from '@/lib/types'

interface TimeSlot {
  time: string
  available: boolean
  pricePerHour: number
  isPeak: boolean
  spotsRemaining: number
}

interface AvailabilityResponse {
  slots: TimeSlot[]
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const userType = searchParams.get('userType')

    // Validate required parameters
    if (!date || !userType) {
      return NextResponse.json(
        { error: 'Missing required parameters: date, userType' },
        { status: 400 }
      )
    }

    // Validate user type
    const validUserTypes = ['adult', 'student', 'junior', 'senior']
    if (!validUserTypes.includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      )
    }

    // Parse and validate date
    let bookingDate: Date
    try {
      bookingDate = new Date(date)
      if (isNaN(bookingDate.getTime())) {
        throw new Error('Invalid date')
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Validate date is within 30 days
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)

    if (bookingDate < now) {
      return NextResponse.json(
        { error: 'Date must not be in the past' },
        { status: 400 }
      )
    }

    if (bookingDate > maxDate) {
      return NextResponse.json(
        { error: 'Date must be within 30 days' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Check if date is a holiday
    const isHoliday = await isDateHoliday(bookingDate, supabase)

    // Determine day type
    const dayType: DayType = isHoliday
      ? 'holiday'
      : getDayType(bookingDate, [])

    // Query availability table
    const { data: availabilitySlots, error: availError } = await supabase
      .from('availability')
      .select('start_time, end_time, is_available, max_bookings, current_bookings')
      .eq('date', date)
      .eq('is_available', true)
      .order('start_time', { ascending: true })

    if (availError) {
      console.error('Availability query error:', availError)
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      )
    }

    // If no availability slots, return empty array (not an error)
    if (!availabilitySlots || availabilitySlots.length === 0) {
      return NextResponse.json({ slots: [] }, { status: 200 })
    }

    // For each slot, get pricing
    const slots: TimeSlot[] = []

    for (const slot of availabilitySlots) {
      // Parse start time to hour
      const hour = parseTimeToHour(slot.start_time)

      // Query pricing for this time slot
      const { data: pricingRule, error: pricingError } = await supabase
        .from('pricing_rules')
        .select('price_per_hour, is_peak')
        .eq('user_type', userType)
        .eq('day_type', dayType)
        .lte('start_hour', hour)
        .gt('end_hour', hour)
        .limit(1)
        .single()

      if (pricingError || !pricingRule) {
        console.error(`Pricing not found for ${slot.start_time}:`, pricingError)
        // Skip this slot if pricing not found
        continue
      }

      // Calculate spots remaining
      const spotsRemaining = slot.max_bookings - slot.current_bookings

      // Determine if slot is available
      const isSlotAvailable = spotsRemaining > 0

      // Add to results
      slots.push({
        time: slot.start_time,
        available: isSlotAvailable,
        pricePerHour: Number(pricingRule.price_per_hour),
        isPeak: pricingRule.is_peak,
        spotsRemaining
      })
    }

    const response: AvailabilityResponse = {
      slots
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Availability API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
