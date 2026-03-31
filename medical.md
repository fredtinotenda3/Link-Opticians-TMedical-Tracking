What the Medical Aid Claims Tracker Does
Core Purpose
It solves Link Optical's biggest cash flow problem — medical aids taking 60+ days to pay, with no visibility into what's owed, by whom, and what needs chasing. Before this system, that tracking either didn't exist or lived in someone's head.

Dashboard (/dashboard)
The first thing anyone sees when they open the system. It answers one question immediately: where is Link Optical's money right now?
Total Outstanding Banner — one large dark card at the top showing the exact USD amount owed to Link Optical right now, with a breakdown of how many claims and how many medical aids are involved. Pending and approved counts are shown separately on the right.
Active Claims Cards (3 cards):

Pending — claims submitted to 263 that haven't been approved or rejected yet. Shows total USD and count.
Approved — claims 263 approved but the medical aid hasn't paid yet. This is confirmed money owed.
Overdue 60+ Days — any pending or approved claim older than 60 days. This is the danger card. It tells you exactly what to chase today.

Aging Breakdown Bar — a visual horizontal bar split into green (0–30 days), amber (31–60 days), and red (60+ days) showing the proportion of outstanding money by age. At a glance you can see the health of your receivables.
Outstanding by Medical Aid — each medical aid (PSMAS, CIMAS, First Mutual etc.) shown with their pending amount, approved amount, and total owed, with a proportional bar. Tells you exactly which medical aid owes the most.
Follow-up Due Banner — only appears when claims have passed their 30-day follow-up date. Shows up to 3 claims with patient name, medical aid, claim number and amount. Links directly to the claims table.
Resolved This Month:

Paid This Month — confirms actual revenue collected in the current calendar month
Rejected — shows how many claims were declined and the total value, with a prompt to resubmit

Rejected Action List — if there are rejected claims, they appear at the bottom with the rejection reason from 263 and a direct resubmit link. Nothing gets forgotten.

Claims Table (/claims)
The operational workhorse. Every claim ever logged is here.
Filters — filter by status, medical aid, branch, or search by patient name or claim number. Combinations work together.
Columns — Claim #, Patient Name, Medical Aid, Branch, Amount (with partial payment shown underneath if applicable), Submission Date, Days Outstanding (colour coded green/amber/red), Status badge (colour coded), Actions.
Follow-up highlighting — any row where follow-up is due turns orange with a "⏰ Follow-up due" label under the patient name. You cannot miss it.
Action buttons per claim depend on status:

pending or approved → Update status dropdown (pending/approved/paid) + Partial Pay + Reject + Follow-up date + Edit + Delete
rejected → Resubmit button + Edit + Delete
paid, partial, superseded → Edit + Delete only


New Claim (/claims/new)
Form to log a claim immediately after submitting it on 263. Fields: Claim Number from 263, Amount, Patient Name, Patient ID (VP number), Medical Aid, Member Number, Branch, Service Date, Submission Date, Notes. Saves to MongoDB and redirects to the claims table.

Edit Claim (/claims/[id]/edit)
Opens any existing claim for correction. All fields editable. Useful when a claim number was entered wrong or an amount needs updating.

Reject Dialog
When 263 rejects a claim, you open this dialog, type the rejection reason (e.g. "member not covered", "duplicate claim", "invalid procedure code"), confirm, and the claim is marked rejected with the reason stored. That reason shows on the dashboard rejected list and in the claims table.

Resubmit Dialog
When you fix a rejected claim and resubmit it on 263, you log the new claim number here. The system creates a brand new claim linked to the original, marks the original as superseded (so it disappears from outstanding totals), and the new claim starts fresh as pending. The history is preserved.

Partial Payment Dialog
When a medical aid pays less than the full amount — common with PSMAS — you record what they actually paid. The system marks the claim as partial, stores the amount paid, and the balance is written off. The claims table shows both the original amount and what was paid.

Follow-up Date Dialog
Every pending and approved claim automatically gets a follow-up date 30 days after submission. You can override this per claim if needed. When that date arrives, the claim highlights orange in the table and appears in the dashboard banner.

CSV Export
One button on the claims table exports every visible claim (respecting current filters) to a CSV file. Columns include all claim data plus days outstanding, rejection reason, paid date. Named with today's date. Jeffrey or the MD can open it in Excel.

Status Flow — Complete

New claim logged
      ↓
   PENDING  ←──────────────────────────┐
      ↓                                │
  APPROVED  (263 approves)             │
      ↓                                │
    PAID  (full payment received)      │
                                       │
   or                                  │
      ↓                                │
  PARTIAL  (partial payment, closed)   │
                                       │
   or                                  │
      ↓                                │
  REJECTED  (263 declines)             │
      ↓                                │
  RESUBMIT → new PENDING claim ────────┘
  original → SUPERSEDED (hidden from totals)

  What it gives the business that didn't exist before

Exact USD figure owed at any moment — previously unknown
Which medical aid owes what — previously had to call and ask
Which claims are older than 60 days — previously no tracking
Rejection reasons stored — previously lost after a phone call
Resubmission history — previously no record
Monthly revenue confirmed — previously only visible in VP
CSV for finance meetings — previously manual spreadsheet