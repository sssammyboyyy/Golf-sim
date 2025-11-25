import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, skip middleware processing
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase environment variables not found in middleware, skipping auth checks")
    return NextResponse.next({
      request,
    })
  }

  const supabaseResponse = NextResponse.next({
    request,
  })

  // Get auth token from cookies
  const authToken = request.cookies.get("sb-access-token")?.value

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: authToken
          ? {
              Authorization: `Bearer ${authToken}`,
            }
          : {},
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow public access to most pages, only protect admin routes
    if (!user && request.nextUrl.pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error("[v0] Middleware Supabase error:", error)
  }

  return supabaseResponse
}
