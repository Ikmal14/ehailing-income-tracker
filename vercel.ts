import { type VercelConfig } from "@vercel/config/v1";

/**
 * Typed Vercel project configuration (replaces vercel.json).
 *
 * The cron pings the Supabase keep-alive endpoint every 5 days so the free-tier
 * project never reaches the 7-day inactivity pause. On Hobby, cron fires once
 * per day at the scheduled time — i.e. on days 1, 6, 11, 16, 21, 26.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    {
      path: "/api/cron/keep-alive",
      schedule: "0 0 */5 * *",
    },
  ],
};
