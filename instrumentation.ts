// FILE: instrumentation.ts
// Next.js instrumentation hook — runs once on server startup
// Place at project root (same level as app/)

export async function register() {
  // Only run on Node.js runtime (not Edge), and only in server context
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initScheduler } = await import("./lib/automation/scheduler");
      initScheduler();
    } catch (err) {
      console.error("[Instrumentation] Failed to init scheduler:", err);
    }
  }
}