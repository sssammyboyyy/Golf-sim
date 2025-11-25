import { cookies } from "next/headers"

let createSupabaseClient: typeof import("@supabase/supabase-js").createClient | null = null
let initPromise: Promise<void> | null = null

// Mock client for when Supabase is not available
const mockClient = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    update: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    delete: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    eq: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
    }),
    single: () => Promise.resolve({ data: null, error: null }),
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
  rpc: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
} as any

async function initSupabase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const supabase = await import("@supabase/supabase-js")
      createSupabaseClient = supabase.createClient
    } catch (error) {
      console.warn("[v0] Failed to load @supabase/supabase-js on server, using mock client")
      createSupabaseClient = null
    }
  })()

  return initPromise
}

export async function createClient() {
  await initSupabase()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || !createSupabaseClient) {
    return mockClient
  }

  const cookieStore = await cookies()
  const authToken = cookieStore.get("sb-access-token")?.value

  return createSupabaseClient(url, key, {
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
}

export const createServerClient = createClient

// Initialize eagerly but don't block
initSupabase()
