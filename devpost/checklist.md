---
doc: checklist
status: approved
---

<!-- Progress state for 5-build. 5-build reads this file to find the next
     unchecked slice, and rewrites it as it goes — ticking boxes and appending to
     Revisions. Every slice MUST carry the same fields in the same order so parsing
     stays reliable. Learner check: gives the learner a plain-language way to
     try the completed behavior in learn mode and at fast-mode checkpoints.
     Keep this checklist in Markdown only, regardless of Review Format. -->

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Project bootstrap, catalog data model, and Cultural TasteMatch affinity score calculation**
  Becomes usable: The PayAI workspace loads, accepts cultural palate prompts (e.g., "Lagos street style meets Scandinavian minimalism"), queries catalog products, and displays items with normalized 0-100% Taste Affinity badges.
  Why now: Bootstrapping lives inside slice one, and the Unique Kernel (cross-domain cultural taste affinity mapping inspired by Qloo) must come early rather than last.
  PRD ref: `prd.md > Features and Behavior` (Cultural TasteMatch Engine), `prd.md > The Core Journey` (steps 1-2)
  Spec ref: `spec.md > Components` (PayAI Workspace Page, AI Negotiation Orchestrator), `spec.md > Data Model`
  Build: Scaffolded PayAI routes, integrated `catalogSearchService.js` value and taste scoring, wired `qlooAgentTool.js` palate affinity calculation, and rendered cultural badge cards in `frontend/src/pages/PayAI.jsx`.
  Verify (mechanical): Tested `/api/v1/payai/catalog/search` with cultural taste query; confirmed API responds with HTTP 200, returning scored items with `affinityScore` and `badge` metadata.
  Learner check: Open http://localhost:5173/payai, type a cultural aesthetic prompt into the input bar, and confirm matched products appear with percentage affinity tags.
  Commit: `feat(payai): bootstrap workspace with cultural taste-match affinity scoring`

- [x] **2. Conversational AI Sales Representative with bounded deterministic price negotiation**
  Becomes usable: Real-time negotiation dialogue where the buyer can propose counter-offers or bundles, and the AI agent evaluates them against strict seller margin rules.
  Why now: Proves the conversational bargaining loop and guarantees the agent cannot hallucinate prices below the merchant's floor margin before connecting checkout.
  PRD ref: `prd.md > Features and Behavior` (Conversational AI Sales Negotiator), `prd.md > Product Decisions`
  Spec ref: `spec.md > Components` (PayAI Route Dispatcher & Controller, AI Negotiation Orchestrator), `spec.md > Important Failure Modes`
  Build: Implemented `/api/v1/payai/negotiate/turn` endpoint in `payaiController.js`, wired `negotiationEngineService.js` margin floor bounds (`minMarginPercent`, `maxDiscountPercent`), and connected chat message streaming in `PayAI.jsx`.
  Verify (mechanical): Sent POST request with offer below seller margin floor; confirmed agent returns respectful counter-offer bounded at the exact floor limit rather than accepting the loss.
  Learner check: In the PayAI chat panel, offer $50 for a $100 artisan item; confirm the agent counters with the seller's minimum allowable price (e.g., $85) and explains the artisan quality.
  Commit: `feat(payai): implement bounded AI sales negotiator with deterministic floor margins`

- [x] **3. In-chat Landed-Cost Breakdown and Markdown Table Card Rendering**
  Becomes usable: The chat stream parses markdown tables and renders a dedicated financial card (`MarkdownTableCard`) with currency pills, aligned numeric columns, and total row highlights.
  Why now: Transparent financial landed cost (`Base - Discount + Customs + Courier = Total`) is required before locking customer funds into milestone escrow.
  PRD ref: `prd.md > Features and Behavior` (Itemized Landed-Cost Quotes & Markdown Table Cards), `prd.md > Look and Feel`
  Spec ref: `spec.md > Components` (Markdown Table Card & Parser), `spec.md > Look and Feel`
  Build: Created `MarkdownTableCard` component in `frontend/src/pages/PayAI.jsx`, implemented markdown table delimiter parser with regex detection for currency and total labels, and applied Tailwind slate/emerald styling tokens.
  Verify (mechanical): Ran `npm run build:production` to ensure table parser and regex rules bundle cleanly with zero syntax errors or warnings (build passed in 15.65s).
  Learner check: Request a price quote in chat; confirm the agent replies with a structured table featuring clean column borders, currency badges, and a prominent green total row.
  Commit: `feat(payai): add interactive markdown table cards with highlighted totals and currency pills`

- [x] **4. 4-Stage Milestone Escrow State Machine & Dual Checkout**
  Becomes usable: Buyers can check out negotiated deals via PayPal Sandbox or internal Wallet, immediately locking funds into a cryptographic Milestone Escrow account (`LOCKED`).
  Why now: The payment lock is the core trust mechanism bridging buyer protection with cross-border seller liquidity.
  PRD ref: `prd.md > Features and Behavior` (Multi-Day Milestone Escrow State Machine, Dual Payment Gateways)
  Spec ref: `spec.md > Components` (Milestone Escrow Ledger & Controller), `spec.md > Data Model`
  Build: Created `escrowPaymentController.js` and `escrowLedgerService.js`, implemented PayPal v2 order creation and capture endpoints, wired internal wallet balance checkout, and created Prisma escrow records.
  Verify (mechanical): Triggered wallet checkout for negotiated item; verified `EscrowPayment` record created with status `LOCKED`, buyer balance debited, and funds held in vault ledger.
  Learner check: Click the "Lock into Escrow" button on an approved quote; select Wallet or PayPal sandbox; confirm the order status badge updates to "Escrow Locked (Milestone 1 Pending)".
  Commit: `feat(payai): implement 4-stage milestone escrow state machine and dual checkout`

- [x] **5. Seller Negotiation Control Room and Dynamic Margin Floor Settings**
  Becomes usable: Merchants can configure their negotiation boundaries (floor margin %, max bundle discount %, auto-accept threshold) from a dedicated seller studio.
  Why now: Gives sellers complete autonomy over their AI sales representative without needing developer intervention.
  PRD ref: `prd.md > Features and Behavior` (Seller Negotiation Bounds & Control Room)
  Spec ref: `spec.md > Components` (Seller Control Room & Margin Bounds Service)
  Build: Implemented `/api/v1/payai/seller/negotiation-settings` (GET & POST), added store configuration persistence in Prisma, and built the Seller Negotiation Control Room drawer in the frontend.
  Verify (mechanical): Updated seller floor margin to 25% via API; confirmed subsequent negotiation turns enforce the new 25% floor limit.
  Learner check: Open the Seller Control Room drawer, adjust the maximum discount slider to 15%, and verify in buyer chat that the bot refuses discounts greater than 15%.
  Commit: `feat(payai): add seller negotiation control room with dynamic margin controls`

- [x] **6. Real-time Milestone Delivery Simulation, Dispute Freezing, and Automated Fund Disbursement**
  Becomes usable: Complete order lifecycle simulation where shipping milestones (`IN_TRANSIT` -> `DELIVERED`) trigger progressive disbursements, with dispute freeze controls.
  Why now: Closes the core loop by demonstrating how funds are safely released to artisans upon verified fulfillment.
  PRD ref: `prd.md > Features and Behavior` (Multi-Day Milestone Escrow State Machine), `prd.md > The Core Journey` (steps 5-6)
  Spec ref: `spec.md > Components` (Milestone Escrow Ledger & Controller), `spec.md > Data Model`
  Build: Created milestone transition endpoints in `escrowRoutes.js`, added dispute hold flags (`isDisputed`), and implemented atomic fund release via `prisma.$transaction`.
  Verify (mechanical): Simulated delivery confirmation; verified milestone advances to `DELIVERED`, disbursement executes, seller wallet balance increments, and escrow balance zeros out.
  Learner check: In the Escrow Timeline tracker, click "Confirm Delivery"; observe the confetti animation, status badge switching to "Disbursed", and merchant receipt confirmation.
  Commit: `feat(payai): complete milestone lifecycle with dispute protection and automated disbursement`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slices 1 & 2 verified: cultural taste prompt returns affinity badges and interactive chat negotiates within deterministic margin limits.
- [x] Final kick-the-tires exploration and feedback completed — full journey tested end-to-end (prompt -> negotiate -> markdown table quote -> escrow lock -> delivery disbursement).

## Final Review

- [x] Markdown table card with currency pills and highlighted totals implemented and verified across dark/light themes.
- [x] Fallback image handling for product catalog items resolved to ensure no broken images appear during checkout.
- [x] Final review complete — feedback resolved and learner confirms ready to ship.

## Code Tour and App Map

- [x] Learning activity complete — guided route tracing cultural prompt to landed-cost table card and milestone escrow ledger.
- [x] Optional edit and transfer reflection addressed — verified currency switcher and inspected Prisma atomic transaction.
- [x] devpost/app-map.html generated from finished code, checked, and shown, including a project-grounded practice to reuse.

Activity and evidence: Guided code tour tracing cultural prompt through catalog search, bounded sales negotiation, markdown card parsing, and milestone escrow ledger. Verified via `PayAI.jsx`, `payaiController.js`, and `escrowPaymentController.js`.
Route and stops: 3 stops (`frontend/src/pages/PayAI.jsx:MarkdownTableCard`, `backend/src/controllers/payai/payaiController.js:negotiateTurn`, `backend/src/controllers/escrowPaymentController.js:createEscrowPayment`).
Edit outcome: Verified live currency pill formatting and inspected Prisma atomic transactions (`prisma.$transaction`) ensuring double-spend resilience.
Reflection: Reusable practice to decouple AI conversational creativity from deterministic financial rules, using observable acceptance criteria for agentic workflows.
Activity mode: live app and code review.

## Revisions

- Table layout in conversational stream needed dedicated CSS card parser rather than raw unformatted markdown — discovered during slice 3 testing that unformatted markdown tables overflowed narrow chat containers on mobile.
- Product image URLs from mock stores required fallback to Unsplash CDN to prevent 404s — resolved during slice 1 testing when external sample assets returned dead links.
- Escrow disbursement needed compound idempotency keys (`ESCROW_RELEASE:${orderId}:${sellerId}`) — added to prevent duplicate disbursements during rapid buyer confirmation clicks.
