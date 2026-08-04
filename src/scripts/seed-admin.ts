// ============================================
// Admin Bootstrap Script
// ============================================
//
// Usage:
//   npm run seed:admin
//
// This script creates the initial admin user in Supabase Auth
// and ensures the corresponding profile exists with role=admin.
//
// Configuration via environment variables:
//   ADMIN_EMAIL        — Admin login email (default: admin@irtiqa.ai)
//   ADMIN_PASSWORD     — Admin password (REQUIRED — must be set in .env.local or Vercel env)
//   ADMIN_NAME         — Admin display name (default: "Administrator")
//
// Prerequisites:
//   1. Supabase project running (local or remote)
//   2. Migrations applied (profiles table + trigger exists)
//   3. .env.local populated with SUPABASE_SECRET_KEY
//
// Security notes:
//   - Uses SUPABASE_SECRET_KEY — never commit this key
//   - Idempotent: safe to run multiple times (checks for existing user)
//   - Does NOT store the password in any file
//   - Prints the admin credentials once on first run

import { createClient } from "@supabase/supabase-js";

// Load .env.local manually (tsx doesn't auto-load env files)
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@irtiqa.ai";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrator";

async function main() {
  if (!SUPABASE_URL) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL is not set.");
    console.error("  Copy .env.local.example to .env.local and configure it.");
    process.exit(1);
  }

  if (!SECRET_KEY) {
    console.error("ERROR: SUPABASE_SECRET_KEY is not set.");
    console.error("  This script requires the secret key to create users.");
    process.exit(1);
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ERROR: ADMIN_PASSWORD is not set.");
    console.error("  Set ADMIN_PASSWORD in your .env.local (local) or Vercel Environment Variables (production).");
    console.error("  This is the ONLY source of truth for the admin login password.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("=== Admin Bootstrap ===");
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}`);
  console.log("");

  // Check if admin user already exists
  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("ERROR: Could not list users:", listError.message);
    console.error(
      "  Ensure SUPABASE_SECRET_KEY is correct and the project URL is valid.",
    );
    process.exit(1);
  }

  const existingAdmin = existingUsers.users.find(
    (u) => u.email === ADMIN_EMAIL,
  );

  if (existingAdmin) {
    console.log("Admin user already exists:");
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  ID: ${existingAdmin.id}`);
    console.log("");

    // Sync admin password from ADMIN_PASSWORD env var.
    // This is why changing ADMIN_PASSWORD in Vercel now takes effect:
    // the seed script updates the Supabase Auth password to match.
    console.log("Syncing admin password from ADMIN_PASSWORD env var...");
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingAdmin.id,
      { password: adminPassword },
    );

    if (updateError) {
      console.error("ERROR: Could not update admin password:", updateError.message);
      process.exit(1);
    }
    console.log("Admin password updated successfully.");

    // Ensure profile has admin role
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: existingAdmin.id,
          email: ADMIN_EMAIL,
          full_name: ADMIN_NAME,
          role: "admin",
          is_active: true,
        },
        { onConflict: "id" },
      );

    if (profileError) {
      console.error(
        "ERROR: Could not update admin profile:",
        profileError.message,
      );
      process.exit(1);
    }

    console.log("Profile verified (role=admin).");
    console.log("Bootstrap complete — admin password synced.");
    process.exit(0);
  }

  // Create new admin user
  console.log("Creating admin user...");

  const { data: newUser, error: createError } =
    await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME,
        role: "admin",
      },
    });

  if (createError) {
    console.error("ERROR: Could not create admin user:", createError.message);
    process.exit(1);
  }

  console.log("Admin user created successfully!");
  console.log("");
  console.log("=== ADMIN CREDENTIALS (one-time display) ===");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${adminPassword}`);
  console.log("===========================================");
  console.log("");
  console.log("IMPORTANT: Save these credentials now. This password");
  console.log("will not be shown again. Change it after first login.");
  console.log("");

  // Verify profile was created by the trigger
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", newUser.user.id)
    .single();

  if (profile) {
    console.log("Profile verified: created by auto-trigger.");
    if (profile.role !== "admin") {
      console.log("Fixing profile role to admin...");
      await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", newUser.user.id);
      console.log("Profile role updated to admin.");
    }
  } else {
    console.log("WARNING: Profile not auto-created. Creating manually...");
    await supabase.from("profiles").insert({
      id: newUser.user.id,
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: "admin",
      is_active: true,
    });
    console.log("Profile created manually.");
  }

  console.log("");
  console.log("Bootstrap complete.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
