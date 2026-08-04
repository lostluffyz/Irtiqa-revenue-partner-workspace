import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import type { Profile } from "@/types/database";

const PUBLIC_ROUTES = ["/login"];

/**
 * Next.js 16 Proxy — route protection boundary.
 *
 * Replaces the deprecated middleware.ts convention.
 * Handles authentication check, role-based gating, and session cookie refresh.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without auth
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // If user is already authenticated on /login, redirect to their workspace
    const { supabase, supabaseResponse } = createMiddlewareClient(request);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const profile = data as Pick<Profile, "role"> | null;

      if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (profile?.role === "partner") {
        return NextResponse.redirect(new URL("/partner", request.url));
      }
    }

    return supabaseResponse;
  }

  // Skip proxy for static files, API routes, and _next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Protected routes — require authentication
  const { supabase, supabaseResponse } = createMiddlewareClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch profile for role-based access
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const profile = data as Pick<Profile, "role"> | null;

  // Role-based route gating
  if (pathname.startsWith("/admin") && profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/partner", request.url));
  }

  if (pathname.startsWith("/partner") && profile?.role !== "partner") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all request paths except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)",
  ],
};
