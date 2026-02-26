export type UserType = "adult" | "student" | "junior" | "senior" | "guest" | "walk_in"
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show"
export type PaymentStatus = "pending" | "completed" | "paid_instore" | "failed" | "refunded"
export type DayType = "weekday" | "weekend" | "holiday"
export type SessionType = "famous-course" | "quickplay" | "quick" | "4ball" | "3ball"
export type PaymentType = "full" | "deposit" | "bypass"

export interface Booking {
  // Primary Keys & Identifiers
  id: string; // uuid
  booking_request_id?: string; // string (Idempotency Key)
  user_id?: string; // uuid

  // Timestamps
  booking_date: string; // date
  start_time: string;
  end_time: string;
  slot_start: string; // timestamp with time zone 
  slot_end: string; // timestamp with time zone
  duration_hours: number;

  // Game Configuration
  player_count: number;
  session_type: SessionType;
  simulator_id: number;
  famous_course_option?: string;
  user_type: UserType;
  booking_source?: string;

  // Pricing & Payment
  base_price: number;
  total_price: number;
  amount_paid?: number;
  amount_due?: number;
  deposit_amount?: number;
  payment_type?: PaymentType;
  status: BookingStatus;
  payment_status: PaymentStatus;

  // Payment Provider References
  payment_reference?: string;
  yoco_payment_id?: string;
  coupon_code?: string;

  // Guest Details
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  special_requests?: string;

  // Add-ons (Consumables & Services)
  addon_water_qty?: number;
  addon_water_price?: number;
  addon_gloves_qty?: number;
  addon_gloves_price?: number;
  addon_balls_qty?: number;
  addon_balls_price?: number;
  addon_coaching?: boolean;
  addon_club_rental?: boolean;

  // Preferences & Triggers
  accept_whatsapp: boolean;
  enter_competition: boolean;

  // Platform & Observability
  n8n_status?: "pending" | "sent" | "error";
  n8n_response?: string;
  n8n_last_attempt_at?: string;

  // Auditing
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  reminder_1h_sent?: boolean;
  reminder_24h_sent?: boolean;
}

export interface Simulator {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Coupon {
  id: string; // uuid
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number; // or discount_percent
  discount_percent?: number;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}
