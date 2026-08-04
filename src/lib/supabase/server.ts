import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Authenticated server Supabase client.
 *
 * Uses the publishable key (low-privilege, RLS-bound).
 * User context comes from the session cookie — JWT enforces RLS.
 * Never use the secret key for normal partner queries.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if proxy refreshes sessions.
          }
        },
      },
    },
  );
}
