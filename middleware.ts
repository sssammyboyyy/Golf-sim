import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export const config = {
  // Added '|api' to the negative lookahead to exclude all API routes from middleware
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  unstable_allowDynamic: [
    "**/node_modules/@supabase/**",
    "**/node_modules/@supabase/realtime-js/**",
  ],
};
