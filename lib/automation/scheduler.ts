// FILE: lib/automation/scheduler.ts
// Lightweight cron scheduler using node-cron (no Redis/BullMQ needed)
// Runs inside Next.js server — initialize in instrumentation.ts

import cron from "node-cron";
import { FollowUpEngine } from "./followup.engine";
import { EscalationEngine } from "./escalation.engine";

let initialized = false;

export function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("[Scheduler] Initializing automation jobs...");

  // Follow-up engine — every day at 7:00 AM Zimbabwe time (UTC+2 = 05:00 UTC)
  cron.schedule("0 5 * * *", async () => {
    console.log("[Scheduler] Running follow-up engine...");
    try {
      const result = await FollowUpEngine.run();
      console.log("[FollowUpEngine]", result);
    } catch (err) {
      console.error("[FollowUpEngine] Error:", err);
    }
  });

  // Escalation engine — every day at 8:00 AM Zimbabwe time (06:00 UTC)
  cron.schedule("0 6 * * *", async () => {
    console.log("[Scheduler] Running escalation engine...");
    try {
      const result = await EscalationEngine.run();
      console.log("[EscalationEngine]", result);
    } catch (err) {
      console.error("[EscalationEngine] Error:", err);
    }
  });

  console.log("[Scheduler] Jobs registered: follow-up (05:00 UTC), escalation (06:00 UTC)");
}