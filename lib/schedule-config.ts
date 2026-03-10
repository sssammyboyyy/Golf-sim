/**
 * Schedule Configuration for The Mulligan Golf Simulator
 * 
 * Contains operating hours by day of week and holiday overrides.
 * Update HOLIDAY_HOURS to add/remove special trading hours.
 */

import { format, getDay } from "date-fns"

// Standard operating hours by day of week (0 = Sunday, 6 = Saturday)
export const OPERATING_HOURS: Record<number, { open: number; close: number }> = {
    0: { open: 10, close: 16 }, // Sunday (10:00-16:00)
    1: { open: 9, close: 20 },  // Monday (9:00-20:00)
    2: { open: 9, close: 20 },  // Tuesday (9:00-20:00)
    3: { open: 9, close: 20 },  // Wednesday (9:00-20:00)
    4: { open: 9, close: 20 },  // Thursday (9:00-20:00)
    5: { open: 9, close: 20 },  // Friday (9:00-20:00)
    6: { open: 8, close: 20 },  // Saturday (8:00-20:00)
}

/**
 * Holiday hours overrides.
 * - Use { open, close } for modified hours
 * - Use null for closed days
 */
export const HOLIDAY_HOURS: Record<string, { open: number; close: number } | null> = {
    // Festive Season 2025/2026
    '2025-12-16': { open: 10, close: 14 },
    '2025-12-24': null, // Christmas Eve - CLOSED
    '2025-12-25': null, // Christmas Day - CLOSED
    '2025-12-26': null, // Day of Goodwill - CLOSED
    '2025-12-27': { open: 8, close: 20 },
    '2025-12-28': { open: 10, close: 16 },
    '2025-12-29': { open: 9, close: 20 },
    '2025-12-30': { open: 9, close: 20 },
    '2025-12-31': { open: 9, close: 13 },
    '2026-01-01': null, // New Year's Day - CLOSED
}

/**
 * Get operating hours for a specific date.
 * Returns null if the venue is closed on that date.
 */
export function getOperatingHours(date: Date): { open: number; close: number } | null {
    const dateStr = format(date, "yyyy-MM-dd")

    // Check holiday overrides first
    if (dateStr in HOLIDAY_HOURS) {
        return HOLIDAY_HOURS[dateStr]
    }

    // Fall back to standard day-of-week hours
    const dayOfWeek = getDay(date)
    return OPERATING_HOURS[dayOfWeek]
}

/**
 * Check if a date string (YYYY-MM-DD) is a closed day.
 */
export function isClosedDay(dateStr: string): boolean {
    return dateStr in HOLIDAY_HOURS && HOLIDAY_HOURS[dateStr] === null
}

/**
 * Get all closed date strings for calendar highlighting.
 */
export function getClosedDates(): string[] {
    return Object.entries(HOLIDAY_HOURS)
        .filter(([, hours]) => hours === null)
        .map(([date]) => date)
}
