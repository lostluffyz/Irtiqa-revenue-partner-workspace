import { redirect } from "next/navigation";

/**
 * Root page — redirects to the login page.
 * Authenticated users are intercepted by middleware and redirected to
 * their appropriate dashboard before reaching here.
 */
export default function Home() {
  redirect("/login");
}
