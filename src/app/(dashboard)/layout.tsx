"use client";

import { ToastProvider } from "@/components/ui/toast";

/**
 * Authenticated dashboard layout wrapper.
 * Middleware handles session check before reaching here.
 * This layout provides the authenticated page structure with ToastProvider.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
