let createSupabaseClient: typeof import("@supabase/supabase-js").createClient | null = null
let supabaseInstance: ReturnType<typeof import("@supabase/supabase-js").createClient> | null = null
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
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    signOut: () => Promise.resolve({ error: null }),
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
      console.warn("[v0] Failed to load @supabase/supabase-js, using mock client")
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

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(url, key)
  }

  return supabaseInstance
}

// Sync version that returns mock if not initialized (for backwards compat)
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || !createSupabaseClient || !supabaseInstance) {
    return mockClient
  }

  return supabaseInstance
}

// Initialize eagerly but don't block
initSupabase()
