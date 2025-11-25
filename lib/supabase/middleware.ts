import { NextResponse, type NextRequest } from "next/server"

let createSupabaseClient: typeof import("@supabase/supabase-js").createClient | null = null
let initPromise: Promise<void> | null = null

async function initSupabase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const supabase = await import("@supabase/supabase-js")
      createSupabaseClient = supabase.createClient
    } catch (error) {
      console.warn("[v0] Failed to load @supabase/supabase-js in middleware")
      createSupabaseClient = null
    }
  })()

  return initPromise
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, skip middleware processing
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  const supabaseResponse = NextResponse.next({ request })

  // Try to initialize Supabase
  await initSupabase()

  if (!createSupabaseClient) {
    // Supabase package not available, skip auth checks
    return supabaseResponse
  }

  // Get auth token from cookies
  const authToken = request.cookies.get("sb-access-token")?.value

  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
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

// Initialize eagerly but don't block
initSupabase()
