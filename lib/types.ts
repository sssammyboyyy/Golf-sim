export type UserType = "adult" | "student" | "junior" | "senior" | "guest" | "walk_in"
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show"
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded"
export type DayType = "weekday" | "weekend" | "holiday"
export type SessionType = "famous-course" | "quickplay"
export type FamousCourseOption = "4-ball" | "3-ball" | null

export interface Booking {
  id: string
  user_id?: string
  booking_date: string
  start_time: string
  end_time: string
  duration_hours: number
  player_count: number
  session_type: SessionType
  simulator_id?: number
  famous_course_option?: string
  user_type: UserType
  base_price: number
  total_price: number
  status: BookingStatus
  payment_status: PaymentStatus
  payment_type?: "full" | "deposit" | "bypass"
  payment_reference?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  accept_whatsapp: boolean
  enter_competition: boolean
  coupon_code?: string
  special_requests?: string
  created_at: string
  updated_at: string
  cancelled_at?: string
  reminder_1h_sent?: boolean
  reminder_24h_sent?: boolean
}

export interface Upsell {
  id: string
  name: string
  description?: string
  price: number
  category: string
  trigger_condition?: any
  is_active: boolean
  image_url?: string
  created_at: string
  updated_at: string
}

export interface PricingRule {
  id: string
  user_type: UserType
  day_type: DayType
  start_hour: number
  end_hour: number
  price_per_hour: number
  is_peak: boolean
  created_at: string
  updated_at: string
}
