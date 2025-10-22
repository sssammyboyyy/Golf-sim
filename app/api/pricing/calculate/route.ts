/**
 * Pricing Calculation API Endpoint
 * POST /api/pricing/calculate
 *
 * Calculates the price per hour for a specific booking based on:
 * - Date (determines day type: weekday/weekend/holiday)
 * - Time (determines peak/off-peak)
 * - User type (adult/student/junior/senior)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDayType, isDateHoliday, parseTimeToHour } from '@/lib/pricing'
import type { DayType } from '@/lib/types'

interface CalculateRequest {
  date: string        // YYYY-MM-DD
  time: string        // HH:MM
  userType: 'adult' | 'student' | 'junior' | 'senior'
}

interface CalculateResponse {
  pricePerHour: number
  isPeak: boolean
  dayType: DayType
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CalculateRequest = await request.json()
    const { date, time, userType } = body

    // Validate required fields
    if (!date || !time || !userType) {
      return NextResponse.json(
        { error: 'Missing required fields: date, time, userType' },
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

    // Parse date
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

    // Validate date is not in the past
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    if (bookingDate < now) {
      return NextResponse.json(
        { error: 'Cannot price past dates' },
        { status: 400 }
      )
    }

    // Parse time to hour
    let hour: number
    try {
      hour = parseTimeToHour(time)
      if (hour < 0 || hour > 23) {
        throw new Error('Invalid hour')
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid time format' },
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

    // Query pricing rules table
    const { data: pricingRules, error: pricingError } = await supabase
      .from('pricing_rules')
      .select('price_per_hour, is_peak')
      .eq('user_type', userType)
      .eq('day_type', dayType)
      .lte('start_hour', hour)
      .gt('end_hour', hour)
      .limit(1)
      .single()

    if (pricingError || !pricingRules) {
      console.error('Pricing query error:', pricingError)
      return NextResponse.json(
        { error: 'No pricing available for selected time' },
        { status: 404 }
      )
    }

    // Return pricing data
    const response: CalculateResponse = {
      pricePerHour: Number(pricingRules.price_per_hour),
      isPeak: pricingRules.is_peak,
      dayType
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Pricing calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
