import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
// ```

// ---

// ## What you now have
// ```
// ┌─────────────┬──────────────────────────────────┐
// │  👁️ Link    │                                  │
// │  Optical    │     /dashboard                   │
// │  ─────────  │     /claims                      │
// │  📊 Dash    │     /claims/new                  │
// │  🗂️ Claims  │     /claims/[id]/edit            │
// │  ➕ New     │                                  │
// │             │                                  │
// │  ← Collapse │                                  │
// └─────────────┴──────────────────────────────────┘
// ```

// Collapsed state:
// ```
// ┌────┬─────────────────────────────────────────┐
// │ 👁️ │                                         │
// │ ── │                                         │
// │ 📊 │                                         │
// │ 🗂️ │                                         │
// │ ➕ │                                         │
// │    │                                         │
// │ →  │                                         │
// └────┴─────────────────────────────────────────┘