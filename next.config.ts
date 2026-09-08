import type { NextConfig } from "next";

// The Supabase project origin is needed by connect-src (PostgREST + Auth) and
// img-src (signed attachment URLs). Read it from the environment rather than
// hardcoding, so the header follows dev/staging/prod.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const isDev = process.env.NODE_ENV === "development";

// KNOWN LIMITATION - script-src 'unsafe-inline'
// The App Router streams its RSC payload through inline <script> tags that
// carry no src and cannot be hashed ahead of time. Locking script-src down to
// 'self' alone would break hydration. The correct fix is a per-request nonce,
// which requires a proxy.ts (Next 16 renamed middleware.ts to proxy.ts) and
// forces dynamic rendering on every route. That is deliberately out of scope
// for this pass; see the deferred SEC-8 work.
//
// 'unsafe-eval' is dev-only: React uses eval to rebuild server error stacks in
// the browser. It is never emitted in production.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Every component in this codebase styles via inline style={{}} props.
  // Removing this would be a full CSS refactor, not a security change.
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  `connect-src 'self' ${supabaseOrigin}`.trim(),
  `font-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Clickjacking. frame-ancestors is the modern control; X-Frame-Options is
  // kept for older browsers that ignore it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version to attackers.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
