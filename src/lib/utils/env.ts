/**
 * Environment variable validation.
 * Fails clearly at build/startup time when required config is missing.
 */

const requiredPublicVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const requiredServerVars = ["SUPABASE_SECRET_KEY"] as const;

function checkEnvVar(name: string): void {
  if (!process.env[name]) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `  Copy .env.local.example to .env.local and fill in the values.`,
    );
  }
}

/**
 * Validate all required environment variables.
 * Call this during app initialization to fail fast.
 */
export function validateEnvironment(): void {
  for (const v of requiredPublicVars) {
    checkEnvVar(v);
  }

  // Server-only vars — only check on the server side
  if (typeof window === "undefined") {
    for (const v of requiredServerVars) {
      checkEnvVar(v);
    }
  }
}
