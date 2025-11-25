import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 1. Force Edge Runtime for Cloudflare Pages (Critical)
export const runtime = "edge"

// Helper: Force SAST Timezone (+02:00) construction
// This ensures 14:00 is read as South African time, not UTC
function createSASTTimestamp(dateStr: string, timeStr: string): string {
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}+02:00`;
}

// Helper: Add hours to a timestamp for the end time
function addHoursToTimestamp(timestamp: string, hours: number): string {
  const date = new Date(timestamp);
  date.setHours(date.getHours() + hours);
  return date.toISOString(); 
}

// Keep the text helper for the 'end_time' text column (Legacy UI support)
function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setHours(date.getHours() + duration)
  return date.toTimeString().slice(0, 5) 
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      booking_date,
      start_time,
      duration_hours,
      player_count,
      session_type,
      famous_course_option,
      base_price,
      total_price,
      guest_name,
      guest_email,
      guest_phone,
      accept_whatsapp,
      enter_competition,
      coupon_code,
      simulator_id = 1, // Default to 1 if not provided (Critical for locking)
    } = body

    const supabase = await createClient()

    // 1. Sanitize Coupon Code
    const cleanCouponCode = coupon_code ? coupon_code.trim() : null

    let dbTotalPrice = total_price
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    // 2. Coupon Logic
    if (cleanCouponCode) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCouponCode)
        .eq("is_active", true)
        .single()

      if (couponData) {
        couponApplied = cleanCouponCode
        // ADMIN BYPASS
        if (couponData.code === "MULLIGAN_ADMIN_100") {
          dbTotalPrice = base_price 
          dbPaymentStatus = "paid_instore" 
          dbStatus = "confirmed"
          skipYoco = true
        }
        // 100% DISCOUNT
        else if (couponData.discount_percent === 100) {
