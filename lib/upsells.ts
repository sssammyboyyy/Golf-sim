/**
 * Upsells Helper Utilities
 * Functions for evaluating upsell trigger conditions and filtering eligible offers
 */

/**
 * Booking context for evaluating upsell trigger conditions
 */
export interface BookingContext {
  date: string          // ISO date string (YYYY-MM-DD)
  time: string          // Time string (HH:MM)
  duration: number      // Duration in hours
  playerCount: number   // Number of players
  userType: string      // User type (adult, student, junior, senior)
  isFirstBooking: boolean  // Whether this is user's first booking
}

/**
 * Trigger condition structure (matches JSONB in database)
 */
export interface TriggerCondition {
  duration_less_than?: number
  duration_min?: number
  player_count_equals?: number
  player_count_min?: number
  day_of_week?: number | number[]
  time_range?: [string, string]
  is_first_booking?: boolean
  is_combo_booking?: boolean
}

/**
 * Evaluate a trigger condition against booking context
 * @param condition - Trigger condition object (can be null for always-show upsells)
 * @param context - Booking context
 * @returns boolean - True if condition is met (upsell should be shown)
 */
export function evaluateTriggerCondition(
  condition: TriggerCondition | null | undefined,
  context: BookingContext
): boolean {
  // If no condition, always show (static upsells)
  if (!condition) {
    return true
  }

  // All conditions must pass (AND logic)

  // Check duration_less_than
  if (condition.duration_less_than !== undefined) {
    if (context.duration >= condition.duration_less_than) {
      return false
    }
  }

  // Check duration_min
  if (condition.duration_min !== undefined) {
    if (context.duration < condition.duration_min) {
      return false
    }
  }

  // Check player_count_equals
  if (condition.player_count_equals !== undefined) {
    if (context.playerCount !== condition.player_count_equals) {
      return false
    }
  }

  // Check player_count_min
  if (condition.player_count_min !== undefined) {
    if (context.playerCount < condition.player_count_min) {
      return false
    }
  }

  // Check day_of_week
  if (condition.day_of_week !== undefined) {
    const date = new Date(context.date)
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

    if (Array.isArray(condition.day_of_week)) {
      // Multiple days allowed
      if (!condition.day_of_week.includes(dayOfWeek)) {
        return false
      }
    } else {
      // Single day
      if (dayOfWeek !== condition.day_of_week) {
        return false
      }
    }
  }

  // Check time_range
  if (condition.time_range) {
    const [startTime, endTime] = condition.time_range

    // Compare times as strings (works because HH:MM format)
    if (context.time < startTime || context.time > endTime) {
      return false
    }
  }

  // Check is_first_booking
  if (condition.is_first_booking !== undefined) {
    if (context.isFirstBooking !== condition.is_first_booking) {
      return false
    }
  }

  // Check is_combo_booking (for future feature)
  if (condition.is_combo_booking !== undefined) {
    // Currently not implemented - combo bookings don't exist yet
    // This will always be false for now
    return false
  }

  // All conditions passed
  return true
}

/**
 * Filter upsells to only eligible ones based on booking context
 * @param upsells - Array of all active upsells
 * @param context - Booking context
 * @returns Array of eligible upsells
 */
export function filterEligibleUpsells<T extends { trigger_condition: any }>(
  upsells: T[],
  context: BookingContext
): T[] {
  return upsells.filter(upsell => {
    return evaluateTriggerCondition(upsell.trigger_condition, context)
  })
}

/**
 * Generate a unique referral code for a booking
 * @param bookingId - Booking UUID
 * @returns string - 8-character referral code
 */
export function generateReferralCode(bookingId: string): string {
  // Take first 8 chars of booking ID and uppercase
  return bookingId.slice(0, 8).toUpperCase()
}

/**
 * Check if an upsell is a daypart promo (replaces base price)
 * @param category - Upsell category
 * @returns boolean - True if upsell replaces base booking price
 */
export function isDaypartPromo(category: string): boolean {
  return category === 'daypart_promo'
}

/**
 * Check if an upsell is informational only (no price added)
 * @param category - Upsell category
 * @returns boolean - True if upsell doesn't add to total
 */
export function isInformationalUpsell(category: string): boolean {
  return category === 'referral_offer'
}

/**
 * Calculate total price including upsells
 * @param basePrice - Base booking price (price per hour × duration)
 * @param selectedUpsells - Array of selected upsells with prices
 * @returns object - { totalPrice, hasDaypartPromo, breakdown }
 */
export function calculateTotalWithUpsells(
  basePrice: number,
  selectedUpsells: Array<{ price: number; category: string }>
): {
  totalPrice: number
  hasDaypartPromo: boolean
  breakdown: {
    basePrice: number
    daypartPromoPrice: number
    otherUpsellsTotal: number
    informationalTotal: number
  }
} {
  // Check for daypart promo
  const daypartPromo = selectedUpsells.find(u => isDaypartPromo(u.category))
  const hasDaypartPromo = !!daypartPromo

  // Calculate other upsells (excluding daypart promo and informational)
  const otherUpsellsTotal = selectedUpsells
    .filter(u => !isDaypartPromo(u.category) && !isInformationalUpsell(u.category))
    .reduce((sum, u) => sum + u.price, 0)

  // Calculate informational upsells total (for display, not added to price)
  const informationalTotal = selectedUpsells
    .filter(u => isInformationalUpsell(u.category))
    .reduce((sum, u) => sum + u.price, 0)

  // Calculate total
  let totalPrice: number
  if (hasDaypartPromo) {
    // Daypart promo replaces base price
    totalPrice = daypartPromo.price + otherUpsellsTotal
  } else {
    // Normal: base + upsells
    totalPrice = basePrice + otherUpsellsTotal
  }

  return {
    totalPrice,
    hasDaypartPromo,
    breakdown: {
      basePrice: hasDaypartPromo ? 0 : basePrice,
      daypartPromoPrice: hasDaypartPromo ? daypartPromo.price : 0,
      otherUpsellsTotal,
      informationalTotal
    }
  }
}

/**
 * Get user-friendly description of trigger condition
 * @param condition - Trigger condition object
 * @returns string - Human-readable description
 */
export function describeTriggerCondition(condition: TriggerCondition | null): string {
  if (!condition) {
    return 'Always available'
  }

  const parts: string[] = []

  if (condition.duration_less_than !== undefined) {
    parts.push(`sessions under ${condition.duration_less_than} hours`)
  }

  if (condition.duration_min !== undefined) {
    parts.push(`sessions of ${condition.duration_min}+ hours`)
  }

  if (condition.player_count_equals !== undefined) {
    parts.push(`${condition.player_count_equals} player${condition.player_count_equals > 1 ? 's' : ''}`)
  }

  if (condition.player_count_min !== undefined) {
    parts.push(`${condition.player_count_min}+ players`)
  }

  if (condition.day_of_week !== undefined) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (Array.isArray(condition.day_of_week)) {
      const dayNames = condition.day_of_week.map(d => days[d])
      parts.push(`on ${dayNames.join(' or ')}`)
    } else {
      parts.push(`on ${days[condition.day_of_week]}`)
    }
  }

  if (condition.time_range) {
    parts.push(`between ${condition.time_range[0]} and ${condition.time_range[1]}`)
  }

  if (condition.is_first_booking) {
    parts.push('first-time users only')
  }

  if (condition.is_combo_booking) {
    parts.push('combo bookings only')
  }

  return parts.length > 0 ? parts.join(', ') : 'Always available'
}

/**
 * Sort upsells by priority for display
 * Priority order: daypart_promo > time_extension > social_upgrade > food_bundle > other
 * @param upsells - Array of upsells
 * @returns Sorted array of upsells
 */
export function sortUpsellsByPriority<T extends { category: string }>(upsells: T[]): T[] {
  const priorityOrder = {
    daypart_promo: 1,
    time_extension: 2,
    social_upgrade: 3,
    food_bundle: 4,
    referral_offer: 5,
    food: 6,
    beverage: 7,
    equipment: 8,
    lesson: 9,
    combo_bundle: 10
  }

  return [...upsells].sort((a, b) => {
    const priorityA = priorityOrder[a.category as keyof typeof priorityOrder] || 99
    const priorityB = priorityOrder[b.category as keyof typeof priorityOrder] || 99
    return priorityA - priorityB
  })
}
