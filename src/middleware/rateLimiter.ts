import rateLimit from "express-rate-limit";

// General API abuse prevention.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later", errors: [] },
});

// Tighter limiter for auth endpoints (brute-force protection).
//
// NOTE: the frontend is a BFF (backend-for-frontend) - the browser calls the
// Next.js server, which then calls this API server-side. That means every
// real visitor to the frontend shares the SAME source IP as far as this
// backend is concerned (the frontend's own server IP), not their individual
// browser IP. A tight per-IP limit here would end up rate-limiting all of
// the frontend's visitors collectively instead of individual bad actors.
// 100 per 15 minutes still meaningfully blocks a brute-force script hitting
// this API directly, while giving normal shared frontend traffic headroom.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, please try again later", errors: [] },
});