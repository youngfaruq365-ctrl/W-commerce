---
doc: spec
status: approved
---

# W-Commerce PayAI — Technical Specification

Cross-border AI commerce engine with cultural taste-matching, autonomous price negotiation, landed-cost calculation, and progressive milestone escrow protection.

Implements `prd.md > The Core Journey` and fulfills `scope.md > The POC Boundary`.

---

## How This Works, In Plain Language

If you were explaining W-Commerce PayAI aloud to a fellow developer, merchant, or hackathon evaluator, this is how you would describe the system:

> "W-Commerce PayAI is a specialized cross-border commerce platform designed to remove the two biggest barriers in international trade: **discovery friction** and **transactional mistrust**. When a shopper visits the platform, they do not enter rigid keyword queries; instead, they describe an aesthetic, cultural vibe, or artisanal blend—such as *'Lagos street style meets Tokyo minimalist techwear'*.
>
> The system breaks this problem down into four connected, verifiable subsystems:
> 
> 1. **The Cultural TasteMatch Subsystem:** It parses the buyer's cultural prompt against our curated catalog, calculating a 0–100% affinity score based on craft provenance, silhouette tags, and material heritage.
> 2. **The Autonomous AI Sales Negotiator:** Rather than dealing with static prices or slow email exchanges, the buyer negotiates pricing and multi-item bundles in a live conversational chat. The AI salesperson speaks with cultural authenticity, but its pricing logic is strictly governed by deterministic mathematical boundaries configured by the merchant—preventing it from ever selling at a loss.
> 3. **The Landed-Cost Calculator & Markdown Card Generator:** Once terms are agreed upon, the engine generates an itemized Markdown financial breakdown directly inside the chat feed. It details base price, negotiated discounts, international insured freight, and estimated customs tariffs, giving the buyer 100% price transparency.
> 4. **The Milestone Escrow Ledger:** When the buyer authorizes checkout (via PayPal Sandbox or an instantaneous internal digital wallet), the buyer's money is not handed straight to the merchant. Instead, funds are locked into a 4-stage smart escrow contract. The funds safely advance from `ESCROW_LOCKED` to `IN_TRANSIT` to `DELIVERED`, and only upon verified delivery are they automatically disbursed to the merchant's account through an atomic database transaction.
>
> If an issue arises before delivery, either party can freeze the transaction in a dispute state. The buyer gets total fraud protection, and the artisan gets guaranteed payment for completed work."

---

## The Core Journey Through The System

Implements `prd.md > The Core Journey`.

The six sequential steps of the user journey are traced below across frontend components, network API requests, backend services, Prisma database models, and real-time Socket.IO events:

```
[Buyer UI: PayAI.jsx] 
       │ 
       ├─(1) Search Prompt ─────────► POST /api/v1/payai/catalog/search ──► qlooAgentTool & catalogSearchService
       │                                                                         │ (Affinity 0-100%)
       ├─(2) Select Product ◄──────── JSON Catalog Stream with Affinity ◄────────┘
       │
       ├─(3) Negotiate Offer ───────► POST /api/v1/payai/negotiate/turn ──► negotiationEngineService
       │                                                                         │ (Check Margin Bounds)
       ├─(4) Landed Cost Card ◄────── JSON + Markdown Table Synthesis ◄──────────┘
       │
       ├─(5) Lock in Escrow ────────► POST /api/v1/payai/checkout/wallet ─► prisma.$transaction
       │                                                                         │ [PayAIOrder + EscrowPayment]
       │                                                                         ▼
       └─(6) Milestone Dispatch ───► POST /api/v1/escrow/confirm-delivery ─► escrowLedgerService (Atomic Payout)
```

### Step 1: Cultural Taste Discovery & Palate Prompting
- **Frontend Action:** The buyer types an aesthetic prompt into the Cultural Palate Bar (`frontend/src/pages/PayAI.jsx`) or clicks one of the curated seed chips (`"Lagos Street x Tokyo Tech"`).
- **Network Call:** Client dispatches `POST /api/v1/payai/catalog/search` or initiates an active conversation session via `POST /api/v1/payai/payai/sessions/:id/messages`.
- **Backend & Service Layer:** Handled by `backend/src/controllers/payai/payaiController.js` and routed to `backend/src/services/payai/qlooAgentTool.js` alongside `catalogSearchService.js`.
- **Database Model:** Creates or updates `PayAISession` and `PayAIMessage` records with user prompt metadata.
- **Socket Event:** None required; synchronous HTTP response streams the initial parsed affinity weights.

### Step 2: Semantic Affinity Matching & Catalog Exploration
- **Frontend Action:** The catalog grid dynamically reorders. Matched products render inside `PayAIProductCard.jsx` and `PayAITasteMatchCard.jsx`, displaying cultural badges (e.g., *"Kyoto x Lagos"*) and affinity percentage meters (e.g., *"94% Cultural Affinity"*).
- **Backend Service:** `catalogSearchService.js` evaluates item metadata (`culturalTags`, `originCountry`, `materials`) against prompt descriptors, normalizing the score between 0% and 100%.
- **Database Model:** Reads active inventory from `Product` and `Store` tables in SQLite via Prisma Client (`prisma.product.findMany`).
- **UI State:** Selected item is registered into the active negotiation context within `PayAI.jsx` local state.

### Step 3: Conversational AI Sales Bargaining & Bundle Negotiation
- **Frontend Action:** The buyer clicks *"Negotiate Deal"*, opening the split-pane negotiation deck. The buyer proposes a price reduction or bundle discount (e.g., *"Can I get $150 instead of $185?"*).
- **Network Call:** Client issues `POST /api/v1/payai/negotiate/turn` with `{ productId, proposedPrice, userMessage, currency: 'USD' }`.
- **Backend Service:** Handled by `negotiationEngineService.js` and `payaiOrchestrator.js`. The service fetches the merchant's configured margin parameters (`floorPriceMarginPercent`, `maxDiscountPercent`) from `Store` or in-memory settings cache.
- **Invariant Rule Check:** If `proposedPrice < hardFloorPrice`, the engine deterministically overrides any LLM proposal and generates a bounded counter-offer (e.g., `"$165.00"`).
- **Database Model:** Persists the turn into `PayAIMessage` and updates `PayAISession.metadata`.
- **Socket Event:** Broadcasts `payai:negotiation_turn` to notify any listening merchant dashboard session.

### Step 4: Itemized Landed-Cost Breakdown via Markdown Table Cards
- **Frontend Action:** Once the counter-offer is converged upon, the assistant outputs a formal price quote.
- **Backend Service:** `pricingService.js` synthesizes the landed-cost equation:
  $$\text{Landed Cost} = (\text{Base Price} - \text{Negotiated Savings}) + \text{Customs/Tariff} + \text{Insured Shipping}$$
- **Data Transformation:** Formats the quote into a standardized Markdown financial table and returns `{ quoteNumber, subtotal, discount, duties, shipping, total, markdownTable }`.
- **Frontend Component:** `MarkdownTableCard` (embedded in `PayAI.jsx`) parses the Markdown syntax into a styled, responsive fintech card with green total highlights, currency symbols, and an *"Accept Offer & Lock Escrow"* call-to-action button.
- **Database Model:** Writes a persistent `PayAIQuote` with a 15-minute expiration timestamp (`expiresAt = now() + 15m`).

### Step 5: Instant Agreement & Milestone Escrow Lock
- **Frontend Action:** The buyer clicks *"Accept Offer & Lock Escrow"*. The checkout modal presents **PayPal REST Sandbox** or **Internal Ledger Wallet**.
- **Network Call (Internal Wallet):** Dispatches `POST /api/v1/payai/checkout/wallet` with `{ quoteId, currency: 'USD' }`.
- **Network Call (PayPal Sandbox):** Dispatches `POST /api/v1/payai/paypal/create-order` -> returns PayPal Order ID -> buyer approves in PayPal popup -> dispatches `POST /api/v1/payai/paypal/orders/:id/capture`.
- **Prisma Atomic Transaction:** Executed inside `prisma.$transaction(async (tx) => { ... })`:
  1. Verifies quote validity (`status == 'ACTIVE'` and `now() < expiresAt`).
  2. Debits buyer wallet or verifies external PayPal capture authorization.
  3. Inserts `PayAIOrder` with `paymentStatus = 'VERIFIED'` and `fulfillmentStatus = 'CONFIRMED'`.
  4. Inserts `EscrowPayment` with `status = 'HELD'`, locking full funds in custody.
  5. Inserts `WalletHold` locking buyer balance with reason `'ESCROW'`.
  6. Inserts `PayAIOrderStatusEvent` documenting the initial lock.
- **Socket Event:** Emits `escrow:milestone_transition` with `{ orderId, status: 'ESCROW_LOCKED' }`.
- **UI Transition:** Workspace automatically flips from Tab 1 (Chat) to Tab 2 (`PayAIOrderTracker.jsx`), illuminating Step 1 (`ESCROW_LOCKED`) in radiant emerald.

### Step 6: Progressive Milestone Tracking & Automated Disbursement
- **Frontend Action:** Evaluator or merchant clicks *"Simulate Dispatch"*, followed by *"Simulate Delivery"*.
- **Network Call (Dispatch):** Client posts to `/api/v1/payai/orders/:id/track` with dispatch event. State updates to `IN_TRANSIT` with tracking number `DHL-EXP-4402-NIG`.
- **Network Call (Delivery & Settlement):** Client calls `POST /api/v1/payai/orders/:id/confirm-receipt` (or `POST /api/v1/escrow/confirm-delivery`).
- **Prisma Atomic Payout:** Handled by `escrowLedgerService.js` inside an atomic transaction:
  1. Updates `EscrowPayment.status` from `'HELD'` to `'RELEASED'`.
  2. Calculates platform fee (10%) and net merchant proceeds (90%).
  3. Releases `WalletHold` record.
  4. Credits merchant wallet (`Wallet.balance += netAmount`).
  5. Logs `WalletTransaction` / `WalletLedgerEntry` with `type = 'ESCROW_RELEASE'`.
  6. Appends `PayAIOrderStatusEvent` with `status = 'DISBURSED'`.
- **Socket Event:** Broadcasts `order:status_updated` and `escrow:disbursed` to client sockets.
- **Frontend Feedback:** `PayAIOrderTracker.jsx` lights up Step 4 (`DISBURSED`), fires `canvas-confetti` fireworks, and displays a net merchant payout ledger card.

---

## Stack

Implements `prd.md > Look and Feel` and technical requirements.

| Layer / Dependency | Version | Documentation Link | Selection Rationale & Accepted Tradeoff |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`^19.2.8`) | [react.dev](https://react.dev) | High rendering performance, latest React Server Components & Action hooks support. *Tradeoff:* Stricter hydration semantics and compiler optimizations require careful handling of browser globals. |
| **Build Tool & Bundler** | Vite (`^8.2.2`) | [vite.dev](https://vite.dev) | Instant hot module replacement (HMR), sub-second build times, native ES module support in development. *Tradeoff:* Requires explicit environment variable prefixes (`VITE_`). |
| **Styling Engine** | Tailwind CSS (`^4.3.3`) | [tailwindcss.com](https://tailwindcss.com) | Utility-first CSS engine; eliminates dead style sheets and enables rapid token-level consistency across dark fintech themes. *Tradeoff:* Dynamic arbitrary classes must be safelisted. |
| **Client State Management** | Zustand (`^5.0.15`) | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) | Microscopic bundle footprint (<2KB), zero boilerplate, unopinionated hook-based stores for Cart, Auth, and Wallet. *Tradeoff:* Minimal devtool integration compared to Redux Toolkit. |
| **Animation & Micro-interactions** | Framer Motion (`^13.1.1`) | [motion.dev](https://motion.dev) | Declarative physics-based animations for tab switching, drawer slides, and milestone progress pulses. *Tradeoff:* Moderate JavaScript bundle weight (~30KB gzipped). |
| **Icons & Visual Accents** | Lucide React (`^1.38.0`) | [lucide.dev](https://lucide.dev) | Clean, consistent SVG iconography spanning fintech, e-commerce, and logistics domains. *Tradeoff:* Tree-shaking must be verified to prevent importing unused glyphs. |
| **Backend Runtime & Framework** | Node.js (v20+) & Express (`^4.21.0`) | [expressjs.com](https://expressjs.com) | Battle-tested HTTP routing, middleware pipeline, universal JSON handling, and immediate familiarity. *Tradeoff:* Callback/Promise error handling requires structured `express-async-errors`. |
| **Database ORM & Schema Engine** | Prisma ORM (`^5.20.0` / `@prisma/client: ^5.22.0`) | [prisma.io/docs](https://www.prisma.io/docs) | Type-safe query builder, declarative schema migrations, and atomic `$transaction` primitives essential for double-spend prevention. *Tradeoff:* SQLite provider has limited concurrent write scaling compared to PostgreSQL. |
| **Real-Time Transport** | Socket.IO (`^4.8.0` / client `^4.8.3`) | [socket.io/docs/v4](https://socket.io/docs/v4/) | Bidirectional WebSocket communication with automatic HTTP long-polling fallback for real-time negotiation and milestone pushes. *Tradeoff:* Stateful connections require connection heartbeats. |
| **External Payment Gateway** | PayPal REST API v2 | [developer.paypal.com](https://developer.paypal.com/docs/api/orders/v2/) | Industry-standard merchant payment authorization and sandbox verification for cross-border credit card/PayPal checkout. *Tradeoff:* External sandbox API calls subject to network latency. |
| **Visual Celebration** | canvas-confetti (`^1.9.3`) | [npmjs.com/package/canvas-confetti](https://www.npmjs.com/package/canvas-confetti) | Lightweight canvas particle emitter for rewarding milestone completion during demo reviews. *Tradeoff:* Pure visual polish; strictly non-critical to transaction logic. |

---

## Where It Runs and How Someone Tries It

Implements `prd.md > Dual Payment Gateways` and Devpost evaluation requirements.

### Environment & Runtime Requirements
- **Node.js:** v18.18.0+ or v20.x recommended.
- **NPM:** v9.x or v10.x.
- **Operating System:** Windows, macOS, or Linux.
- **Port Allocations:**
  - Frontend Dev Server: `http://localhost:5173`
  - Backend API Gateway: `http://localhost:5000` (proxied or CORS-enabled)
- **Environment Configuration:**
  - Backend reads from root `.env` or `backend/.env`. Key variables:
    ```bash
    PORT=5000
    DATABASE_URL="file:../../database/prisma/dev.db"
    JWT_SECRET="w_commerce_payai_secret_key_2026"
    PAYPAL_CLIENT_ID="mock_sandbox_client_id"
    PAYPAL_CLIENT_SECRET="mock_sandbox_secret"
    PLATFORM_COMMISSION_RATE=0.10
    ```

### Startup Commands

To start the full-stack development environment:

```bash
# Terminal 1: Start both frontend and backend concurrently from project root
npm run dev

# OR run in separate terminals:
# Terminal 1 (Backend API):
npm run dev:backend

# Terminal 2 (Frontend Client):
npm run dev:frontend
```

### Production Verification Build Command

Before submission or recording, verify the frontend build succeeds without syntax errors:

```bash
npm run build:production
```

### Exact Evaluation URL
Open Chrome, Edge, or Firefox and navigate to:
```
http://localhost:5173/payai
```

---

### Step-by-Step 90-Second Demo Recording Guide

This script guides the required Devpost video recording:

| Timecode | Visual Screen | Voiceover / Action Script |
| :--- | :--- | :--- |
| **0:00 – 0:15** | `http://localhost:5173/payai`<br>Cultural Palate Bar | *"Welcome to W-Commerce PayAI. In traditional cross-border trade, discovery is rigid and buyers bear all the delivery risk. PayAI solves this. Watch as I enter a cultural aesthetic prompt: 'Lagos street style meets Tokyo minimalist techwear'. Notice how the TasteMatch engine instantly scores catalog items, ranking this Hand-Dyed Indigo Shibori Kimono at 94% cultural affinity."* |
| **0:15 – 0:40** | Split-Pane Workspace<br>Negotiation Deck | *"Now I click 'Negotiate Deal'. Instead of paying full retail at $185, I propose $150 in natural dialogue. The AI sales agent evaluates my offer against the merchant's configured margin floor in real time. It counters at $165.00, preserving merchant profitability while honoring the cultural context."* |
| **0:40 – 0:55** | Markdown Table Card<br>Inside Chat Stream | *"When we converge on terms, the agent doesn't send a vague message—it renders an itemized Markdown landed-cost financial table directly in the chat feed. It details base price, negotiated savings, international shipping, and estimated customs tariffs, guaranteeing a locked landed total."* |
| **0:55 – 1:15** | Checkout Modal<br>Dual Gateway | *"I click 'Accept Offer & Lock Escrow'. We support both PayPal Sandbox and an instant Internal Ledger Wallet. I authorize the $192 total via our internal wallet. Watch the right pane: funds are immediately debited and locked into an immutable 4-stage escrow contract (#ESC-8921)."* |
| **1:15 – 1:30** | Escrow Milestone Pipeline<br>Progressive Settlement | *"We now advance the escrow pipeline. Step 1 is LOCKED. I simulate carrier pickup—funds advance to IN_TRANSIT with a verified DHL tracking number. Finally, I click 'Confirm Delivery'. The ledger immediately transitions to DISBURSED, automatically transferring 100% of net proceeds to the artisan's merchant balance. Frictionless cultural discovery, bounded AI bargaining, and fraud-proof milestone escrow."* |

---

## Look and Feel

Implements `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

All styling is expressed through strict Tailwind CSS design tokens:

### Color Palette Tokens
- **Canvas Base:**
  - Deep Workspace Floor: `bg-slate-950` (`#020617`)
  - Elevated Container / Sidebars: `bg-slate-900` (`#0f172a`)
  - Elevated Cards / Surfaces: `bg-slate-900/90` (`#0f172a`), `bg-[#121829]/90` with backdrop blur
  - Structural Borders: `border-slate-800` (`#1e293b`), `border-slate-700/60` (`#334155`)
- **Verified Trust & Escrow Accent:**
  - Primary Verified Brand: `text-emerald-400` (`#34d399`), `text-emerald-500` (`#10b981`)
  - Interactive Action Background: `bg-emerald-500`, `hover:bg-emerald-600`
  - Subtle Pill / Badges: `bg-emerald-500/10`, `border-emerald-500/30`, `text-emerald-300`
  - Flow Pipeline Active Node: `ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]`
- **Cultural Discovery Accent:**
  - Aesthetic Affinity Highlighting: `text-cyan-400` (`#22d3ee`), `text-cyan-500` (`#06b6d4`)
  - Affinity Tag Background: `bg-cyan-500/10`, `border-cyan-500/25`
  - AI Prompt Pill: `bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-200`
- **Alert & Dynamic Status Accents:**
  - Transit & Counter-Offers: `text-amber-400` (`#fbbf24`), `bg-amber-500/10`, `border-amber-500/30`
  - Dispute Freeze States: `text-rose-400` (`#fb7185`), `bg-rose-500/10`, `border-rose-500/30`

### Typography Tokens
- **Conversational & Narrative Copy:**
  - `font-sans` (`Inter`, system UI font stack)
  - `leading-relaxed` (1.6) with `text-slate-200` and `text-slate-400` for readable chat logs.
- **Financial & Ledger Figures:**
  - `font-mono` (`JetBrains Mono`, `SF Mono`, `Fira Code`)
  - `tabular-nums` applied to all prices, discounts, quote IDs, airway bill tracking codes, and ledger balances to maintain vertical decimal alignment.

### Density and Visual Energy
- **Density:** Compact, high-information-density fintech aesthetic. Split-pane layout maximizes utility by juxtaposing catalog context with interactive negotiation and escrow tracking.
- **Micro-Transitions:** 180ms ease-out transitions for card reveals, glowing border pulse on newly rendered Markdown quotes, and spring-eased progress fills on the milestone pipeline.

---

## Components

Grouped by layer, every component implements a specific PRD behavior heading.

### PayAI Workspace Page (`frontend/src/pages/PayAI.jsx`)
- **Function:** Serves as the central single-page application orchestrator. Houses the Cultural Palate Bar, catalog grid filter, split-pane view, chat message stream, and escrow progress tabs.
- **Communication:** Connects to `apiClient` (`axios`) for HTTP queries and mutations; binds to `socketClient` for real-time seller pushes; coordinates Zustand stores (`useAuthStore`, `useCartStore`, `useWalletStore`).
- **PRD Cross-Reference:** Implements `prd.md > Screens and Layout` and `prd.md > States and Boundaries`.

### Markdown Table Card & Parser (`MarkdownTableCard` in `PayAI.jsx`)
- **Function:** Parses Markdown table syntax generated by the AI sales agent into an interactive, high-trust financial card. Formats aligned headers, parses currency symbols (`$`, `₦`), isolates the grand total row with an emerald badge, and renders clipboard copy controls alongside the *"Accept Offer & Lock Escrow"* action trigger.
- **Communication:** Invoked directly within the message rendering pipeline of `PayAI.jsx`. Dispatches `onAction('ACCEPT_QUOTE', quoteData)` to initiate the checkout flow.
- **PRD Cross-Reference:** Implements `prd.md > Itemized Landed-Cost Quotes & Markdown Table Cards`.

### PayAI Route Dispatcher & Controller (`backend/src/routes/payaiRoutes.js`, `backend/src/controllers/payai/payaiController.js`)
- **Function:** Provides endpoint routing, authentication guards (`optionalAuth`, `sellerAuth`), input schema validation, and dispatch to underlying domain services. Exposes endpoints for discovery, sessions, carts, quotes, PayPal execution, orders, and seller configuration.
- **Communication:** Receives incoming JSON payloads from frontend `apiClient`; delegates business logic to `payaiOrchestrator`, `negotiationEngineService`, `pricingService`, and `cartService`.
- **PRD Cross-Reference:** Implements `prd.md > Conversational AI Sales Negotiator` and `prd.md > Dual Payment Gateways`.

### AI Negotiation Orchestrator (`backend/src/services/payai/payaiOrchestrator.js`, `negotiationEngineService.js`)
- **Function:** Implements the core negotiation loop. Parses buyer offers, evaluates seller margin constraints, constructs persuasive yet economically sound counter-offers, and generates itemized Markdown quotes. Includes deterministic overrides to prevent jailbreaks or below-floor discounts.
- **Communication:** Ingests LLM prompts via `aiService.js` (Google GenAI / Anthropic / mock fallback); queries `prisma.store` for seller boundaries; persists conversation history into `PayAISession` and `PayAIMessage`.
- **PRD Cross-Reference:** Implements `prd.md > Conversational AI Sales Negotiator` and `prd.md > Seller Negotiation Bounds & Control Room`.

### Milestone Escrow Ledger & Controller (`backend/src/controllers/escrowPaymentController.js`, `backend/src/routes/escrowRoutes.js`, `backend/src/services/escrowLedgerService.js`)
- **Function:** Executes the 4-stage deterministic finite state machine (`ESCROW_LOCKED` -> `IN_TRANSIT` -> `DELIVERED` -> `DISBURSED`). Enforces transition guards, calculates platform commission splits (10%), manages wallet holds, and executes atomic fund releases.
- **Communication:** Utilizes `prisma.$transaction` across `EscrowPayment`, `WalletHold`, `Wallet`, and `WalletTransaction`; emits real-time WebSocket notifications via `socketService.js`.
- **PRD Cross-Reference:** Implements `prd.md > Multi-Day Milestone Escrow State Machine`.

### Seller Control Room & Margin Bounds Service (`frontend/src/components/seller/Dashboard/SellerNegotiationControlRoom.jsx`, `negotiationEngineService.js`)
- **Function:** Slide-over control drawer allowing merchants to inspect and calibrate automated negotiation parameters: minimum profit margin floor (5%–30%), maximum AI discretionary discount (5%–35%), and shipping subsidy thresholds.
- **Communication:** Reads and updates settings via `GET/POST /api/v1/payai/seller/negotiation-settings`; updates in-memory constraints in `negotiationEngineService`.
- **PRD Cross-Reference:** Implements `prd.md > Seller Negotiation Bounds & Control Room`.

---

## Data Model

Implements `prd.md > Multi-Day Milestone Escrow State Machine` and schema architecture.

The data layer is defined in `database/prisma/schema.prisma` using SQLite.

### Entity Relationship Diagram

```
┌──────────────┐         1:N         ┌───────────────────┐
│     User     ├────────────────────►│    PayAIOrder     │
│ (BUYER/SELLER)                     └─────────┬─────────┘
└──────┬───────┘                               │ 1:1
       │ 1:1                                   ▼
┌──────▼───────┐                     ┌───────────────────┐
│    Store     │                     │   EscrowPayment   │
│ (Margin Flr) │                     │  (HELD->RELEASED) │
└──────────────┘                     └─────────┬─────────┘
       │ 1:N                                   │ 1:N
┌──────▼───────┐                               ▼
│   Product    │                     ┌───────────────────┐
│(CulturalTags)│                     │PayAIOrderStatusEvt│
└──────────────┘                     └───────────────────┘
```

### Core Entity Definitions

#### 1. User
```prisma
model User {
  id              String      @id @default(uuid())
  email           String      @unique
  fullName        String
  role            String      @default("BUYER") // "BUYER", "SELLER", "ADMIN"
  balance         Decimal     @default(500.0)   // Pre-funded mock wallet balance
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  store           Store?
  payAIOrders     PayAIOrder[] @relation("PayAIUserOrders")
  wallet          Wallet?
  walletHolds     WalletHold[]
}
```

#### 2. Store
```prisma
model Store {
  id                      String    @id @default(uuid())
  sellerId                String    @unique
  seller                  User      @relation(fields: [sellerId], references: [id])
  storeName               String
  floorMarginPercent      Float     @default(0.15) // 15% minimum profit margin
  maxDiscountPercent      Float     @default(0.20) // 20% max discretionary discount
  autoAcceptThreshold     Decimal?  // Price at or above which offers auto-accept
  portfolioConfig         String?   // JSON configuration
  createdAt               DateTime  @default(now())
  products                Product[]
}
```

#### 3. Product
```prisma
model Product {
  id               String    @id @default(uuid())
  storeId          String
  store            Store     @relation(fields: [storeId], references: [id])
  title            String
  description      String
  price            Decimal   // Retail listing price (e.g. 185.00)
  costPrice        Decimal   // Base merchant production cost (e.g. 120.00)
  culturalTags     String    // Comma-separated: "shibori,indigo,kyoto,streetwear"
  originCountry    String    // e.g. "JP", "NG", "MX", "DK"
  culturalAffinity Float     @default(0.85) // Baseline affinity weight
  imageUrl         String
  createdAt        DateTime  @default(now())
}
```

#### 4. PayAIOrder
```prisma
model PayAIOrder {
  id                String                  @id @default(uuid())
  orderNumber       String                  @unique // e.g. "W-DOM-78192-NG"
  userId            String?
  user              User?                   @relation("PayAIUserOrders", fields: [userId], references: [id])
  quoteId           String?
  quote             PayAIQuote?             @relation(fields: [quoteId], references: [id])
  subtotal          Decimal
  shippingCost      Decimal
  dutiesAndTaxes    Decimal                 @default(0)
  grandTotal        Decimal
  paymentProvider   String                  // "PAYPAL", "WALLET"
  paymentStatus     String                  @default("AWAITING_PAYMENT") // "AWAITING_PAYMENT", "VERIFIED", "FAILED"
  fulfillmentStatus String                  @default("CONFIRMED") // "CONFIRMED", "SHIPPED", "DELIVERED"
  trackingNumber    String?                 // e.g. "DHL-EXP-4402-NIG"
  carrierName       String?                 // e.g. "DHL Express"
  idempotencyKey    String?                 @unique
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
  
  payments          PayAIPayment[]
  events            PayAIOrderStatusEvent[]
  escrowPayment     EscrowPayment?
}
```

#### 5. EscrowPayment
```prisma
model EscrowPayment {
  id                 String       @id @default(uuid())
  orderId            String?      @unique
  order              PayAIOrder?  @relation(fields: [orderId], references: [id])
  buyerId            String
  sellerId           String
  totalAmount        Decimal      // Total funds captured in custody
  commissionRate     Float        @default(0.10) // 10% platform fee
  commissionAmount   Decimal      // Platform cut
  sellerAmount       Decimal      // Disbursed net amount
  status             String       @default("HELD") // "HELD", "RELEASE_PENDING", "RELEASED", "DISPUTED", "REFUNDED"
  heldAt             DateTime     @default(now())
  releasedAt         DateTime?
  disputedAt         DateTime?
  releaseTriggeredBy String?      // "SYSTEM_AUTO", "BUYER_CONFIRM", "ADMIN_RESOLVE"
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  
  @@index([status])
  @@index([sellerId])
}
```

#### 6. Wallet & WalletHold
```prisma
model Wallet {
  id          String   @id @default(uuid())
  userId      String   @unique
  currency    String   @default("USD")
  balance     Decimal  @default(500.0)
  isActive    Boolean  @default(true)
  updatedAt   DateTime @updatedAt
}

model WalletHold {
  id            String   @id @default(uuid())
  userId        String
  currency      String   @default("USD")
  amount        Decimal
  reason        String   // "ESCROW"
  referenceType String   // "ORDER"
  referenceId   String   // orderId
  status        String   @default("HELD") // "HELD", "RELEASED", "CANCELLED"
  createdAt     DateTime @default(now())
}
```

### State Machine Transition Rules

```
                      ┌──────────────────┐
                      │  ESCROW_LOCKED   │ (Funds held in neutral custody)
                      └────────┬─────────┘
                               │
                      [Simulate Dispatch]
                               ▼
                      ┌──────────────────┐
                      │    IN_TRANSIT    │ (Carrier tracking assigned)
                      └────────┬─────────┘
                               │
                      [Confirm Delivery]
                               ▼
                      ┌──────────────────┐
                      │    DELIVERED     │ (Delivery verified by buyer)
                      └────────┬─────────┘
                               │
                       [Auto-Disburse]
                               ▼
                      ┌──────────────────┐
                      │    DISBURSED     │ (100% net released to merchant)
                      └──────────────────┘

   * Note: At ESCROW_LOCKED or IN_TRANSIT, either party can trigger [Raise Dispute],
     transitioning the record into DISPUTE_HOLD and freezing disbursement timers.
```

- **Guard Invariant 1:** Transition to `DISBURSED` is prohibited unless the order is currently in `DELIVERED` status.
- **Guard Invariant 2:** Transition to `IN_TRANSIT` requires a non-null `trackingNumber` and `carrierName`.
- **Guard Invariant 3:** A `DISPUTE_HOLD` pauses all scheduled automatic release jobs until an admin or mutual buyer-seller resolution action is registered.

---

## File Structure

Annotated ASCII tree of planned application files and folders:

```
w-commerce-payai/
├── package.json                         # Monorepo root scripts (npm run dev, build:production)
├── devpost/                             # Devpost Learning Hackathon workspace
│   ├── learner-profile.md              # Learner background, goals, review format: html
│   ├── scope.md                        # Unique kernel, core loop, POC boundary (approved)
│   ├── scope.html                      # Interactive companion for Stage 2
│   ├── prd.md                          # Full PRD behaviors, journey, acceptance criteria (approved)
│   ├── prd.html                        # Interactive companion for Stage 3
│   ├── spec.md                         # This technical specification blueprint
│   └── spec.html                       # Standalone interactive companion visualizer
│
├── frontend/                            # React 19 + Vite + Tailwind CSS Client
│   ├── index.html                      # Single-page HTML shell
│   ├── package.json                    # Frontend dependencies (React 19, Framer Motion, Zustand)
│   ├── vite.config.js                  # Vite configuration & dev server proxy
│   └── src/
│       ├── main.jsx                    # Application entry point
│       ├── App.jsx                     # Root router & global toast notification containers
│       ├── pages/
│       │   └── PayAI.jsx               # Unified PayAI Workspace (Catalog, Chat, Tracker, MarkdownCard)
│       ├── components/
│       │   ├── payai/
│       │   │   ├── PayAIProductCard.jsx         # Product card with cultural affinity gauge
│       │   │   ├── PayAITasteMatchCard.jsx      # TasteMatch insight capsule & provenance chip
│       │   │   ├── PayAINegotiationModal.jsx    # Conversational bargaining deck & counter badges
│       │   │   ├── PayAIOrderTracker.jsx        # 4-stage milestone pipeline visualizer
│       │   │   ├── PayAICartDrawer.jsx          # Shopping cart slide-over with quote sync
│       │   │   ├── PayPalCheckoutModal.jsx      # PayPal Sandbox checkout modal wrapper
│       │   │   └── OfficialReceiptCard.jsx      # Post-settlement transaction receipt card
│       │   ├── seller/
│       │   │   └── Dashboard/
│       │   │       └── SellerNegotiationControlRoom.jsx  # Margin floor & discount bounds sliders
│       │   └── buyer/
│       │       └── TopUpModal.jsx               # Quick wallet re-fund modal for testing ($250)
│       ├── store/
│       │   ├── authStore.js            # User persona state (Buyer / Seller)
│       │   ├── cartStore.js            # Active bundle items & target currency
│       │   └── walletStore.js          # Internal ledger wallet balance ($500 initial)
│       ├── lib/
│       │   └── socketClient.js         # Real-time WebSocket connection to backend
│       └── utils/
│           ├── apiClient.js            # Axios client with base URL & JWT token interceptor
│           └── imageHelpers.js         # Image URL resolvers & media fallbacks
│
├── backend/                             # Node.js + Express + Prisma API Gateway
│   ├── server.cjs                      # Express server entry point & Socket.IO initialization
│   ├── package.json                    # Backend dependencies (Express, Prisma, Socket.IO)
│   └── src/
│       ├── routes/
│       │   ├── payaiRoutes.js          # All /api/v1/payai/* routes (search, negotiate, checkout)
│       │   └── escrowRoutes.js         # All /api/v1/escrow/* routes (verify, dispute, release)
│       ├── controllers/
│       │   ├── payai/
│       │   │   └── payaiController.js  # Request handlers for PayAI discovery, chat & orders
│       │   └── escrowPaymentController.js # Escrow initialization, delivery, & dispute handlers
│       ├── services/
│       │   ├── payai/
│       │   │   ├── payaiOrchestrator.js         # Master LLM orchestration & session manager
│       │   │   ├── negotiationEngineService.js  # Deterministic seller margin bounds & offers
│       │   │   ├── catalogSearchService.js      # Cultural affinity vector scoring
│       │   │   ├── pricingService.js            # Landed-cost calculation & Markdown table builder
│       │   │   ├── qlooAgentTool.js             # Cultural taste intelligence cache & tool
│       │   │   ├── paypalPaymentService.js      # PayPal REST API v2 order creation & capture
│       │   │   └── cartService.js               # Cross-border cart persistence
│       │   ├── escrowLedgerService.js  # Atomic Prisma transactions for milestone release
│       │   ├── walletService.js        # Internal wallet holds, credits, & debits
│       │   └── socketService.js        # Socket.IO broadcasting helper
│       └── utils/
│           ├── prismaClient.js         # Reusable Prisma singleton instance
│           └── logger.js               # Winston structured logging utility
│
└── database/                            # Database Layer
    └── prisma/
        ├── schema.prisma               # Complete Prisma schema definition
        └── dev.db                      # Local SQLite development database
```

---

## External Services and Dependencies

Implements API and external integration specifications.

### 1. PayPal REST API v2
- **Purpose:** External checkout authorization simulating realistic international buyer card/wallet payments.
- **Authentication:** OAuth 2.0 Bearer token via HTTP Basic Auth (`PAYPAL_CLIENT_ID:PAYPAL_CLIENT_SECRET`).
- **Endpoints:**
  - `POST https://api-m.sandbox.paypal.com/v2/checkout/orders`
    - *Payload:* `{ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: '192.00' } }] }`
    - *Response:* `{ id: '8XY123456', status: 'CREATED', links: [{ rel: 'approve', href: '...' }] }`
  - `POST https://api-m.sandbox.paypal.com/v2/checkout/orders/{id}/capture`
    - *Response:* `{ id: '8XY123456', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: '9AB987' }] } }] }`
- **Documentation:** [PayPal Orders v2 API](https://developer.paypal.com/docs/api/orders/v2/)
- **Rate Limits & Cost:** Free sandbox tier; unlimited simulated test transactions.
- **Resilience Fallback:** If PayPal sandbox experiences latency >3000ms or authentication errors, the client displays an instant one-click fallback: *"Pay via Internal Ledger Wallet"*.

### 2. Live Exchange Rates Service
- **Purpose:** Harmonizes multi-currency pricing across USD, NGN, GBP, EUR, KES, and GHS.
- **Endpoint:** `GET /api/v1/payai/rates`
- **Response Format:**
  ```json
  {
    "base": "USD",
    "rates": { "USD": 1.0, "NGN": 1480.0, "GBP": 0.78, "EUR": 0.92, "KES": 130.0, "GHS": 15.5 },
    "source": "CACHE_FALLBACK",
    "timestamp": "2026-10-26T00:00:00Z"
  }
  ```
- **Fallback:** In-memory deterministic exchange table ensures the application functions completely offline without internet connectivity.

### 3. Bidirectional WebSockets (Socket.IO)
- **Purpose:** Instant propagation of counter-offers, carrier tracking updates, and escrow disbursement celebrations.
- **Events:**
  - `payai:negotiation_turn`: Emits real-time seller counter-offers to the buyer's active chat.
  - `escrow:milestone_transition`: Emits state progression (`ESCROW_LOCKED` -> `IN_TRANSIT` -> `DELIVERED`).
  - `order:status_updated`: Pushes final settlement and updates buyer and seller wallet balances.

---

## Important Failure Modes

Realistically anticipated failure points and their chosen architectural fallbacks:

### 1. LLM Latency Spike or Malformed Response
- **What Breaks:** The generative AI model takes >4000ms to return or outputs an unparseable JSON string during negotiation.
- **User Experience & Fallback:** `negotiationEngineService.js` incorporates a strict 3500ms timeout boundary. If triggered, the service falls back immediately to a deterministic rule-based counter-offer generator:
  $$\text{Counter Price} = \max(\text{Floor Price}, \text{Retail Price} \times (1 - \text{Max Discount} \times 0.6))$$
  The chat stream smoothly renders the counter-offer and the itemized Markdown card without displaying an error message or breaking the conversation loop.

### 2. PayPal Sandbox Network Hitch or Webhook Dropping
- **What Breaks:** Sandbox PayPal modal fails to respond or webhook callback drops due to local development network tunneling.
- **User Experience & Fallback:** The frontend payment modal provides an instantaneous, pre-funded **Internal Ledger Wallet** button ($500 balance). Clicking this executes the exact same Prisma escrow locking transaction locally with zero external network dependency, ensuring hackathon judges are never blocked.

### 3. Concurrent Escrow Double-Spend or Race Condition
- **What Breaks:** A rapid double-click on *"Confirm Delivery"* or concurrent simulated webhook triggers attempts to disburse merchant proceeds twice.
- **System Defense & Fallback:** `escrowLedgerService.js` wraps all disbursement operations inside `prisma.$transaction(async (tx) => { ... })`. It checks `EscrowPayment.status === 'HELD'` with atomic row-level locking and writes a unique compound idempotency key:
  `idempotencyKey = "ESCROW_RELEASE:" + orderId + ":" + sellerId`
  Any duplicate attempt fails the uniqueness constraint, aborting the second transaction harmlessly.

---

## What Was Simplified and Why

Engineering trade-offs made to keep this proof of concept completely functional, robust, and sized for evaluation:

- **Curated 6-Item Cultural Artisan Catalog instead of Live Multi-Million SKU Index:**  
  *Why:* Demonstrating cultural affinity matching across 6 richly documented artisanal items (featuring authentic Japanese Shibori, Nigerian Aso-Oke, and Scandinavian ceramics) proves the multi-attribute semantic scoring kernel perfectly without requiring Elasticsearch or heavy vector infrastructure.
- **Deterministic Application-Layer Margin Math instead of Unconstrained LLM Pricing:**  
  *Why:* Letting an LLM perform autonomous pricing arithmetic leads to hallucinations and commercial loss. By constraining the LLM to negotiation dialogue while executing price calculations deterministically in Node.js, we guarantee 100% adherence to merchant profit floors.
- **Simulated Carrier Telematics instead of Live FedEx/DHL Enterprise Webhooks:**  
  *Why:* Live courier APIs require corporate account approvals, production credentials, and actual physical packages in transit. Simulating realistic carrier events via interactive buttons (`"Simulate Dispatch"`, `"Confirm Receipt"`) allows evaluators to test the full lifecycle in 30 seconds.
- **Dual Gateway with Internal Mock Wallet instead of Mandatory PayPal Credentials:**  
  *Why:* Requiring evaluators to log into a personal PayPal developer sandbox account creates friction. Providing a pre-funded $500 internal wallet ensures anyone can complete the end-to-end escrow journey in under two clicks.

---

## Decisions and Open Issues

### Consequential Decisions Made

1. **Milestone Escrow State Atomicity vs. Simple Direct Capture:**  
   *Decision:* Rather than implementing a traditional "charge-and-forget" e-commerce checkout, we built a 4-state milestone escrow engine (`LOCKED` -> `IN_TRANSIT` -> `DELIVERED` -> `DISBURSED`).  
   *Tradeoff:* Adds intermediate state tracking and wallet hold management, but directly solves the core problem of cross-border trade friction: buyer fear of non-delivery and merchant fear of chargeback fraud.
2. **In-Chat Markdown Financial Cards vs. External Multi-Page Checkout:**  
   *Decision:* Landed-cost breakdowns are synthesized as rich Markdown table cards inside the conversation feed.  
   *Tradeoff:* Requires custom table parsing components in React, but maintains total context continuity without redirecting the user across multiple disjointed checkout screens.
3. **Prisma `$transaction` Consistency Guarantee:**  
   *Decision:* All wallet balance updates, hold creations, and milestone releases are wrapped in Prisma interactive transactions.  
   *Tradeoff:* Slightly increases database transaction duration, but provides mathematical certainty against double-spending and ledger desynchronization.

### Discussion of Genuine Uncertainty

- **Topic Discussed:** *How to guarantee that an escrow disbursement cannot execute twice if the buyer clicks the confirmation button rapidly or if multiple status events fire simultaneously.*
- **What Clarified It:** By inspecting `backend/src/services/escrowLedgerService.js`, we verified that Prisma's interactive transaction primitive (`prisma.$transaction`) executes atomically. By attaching a deterministic unique idempotency key (`ESCROW_RELEASE:${orderId}:${sellerId}`) and querying the hold status with state transition guards (`status === 'HELD'`), the database engine rejects any secondary execution with a unique constraint violation, guaranteeing ledger integrity.

### Resolution of PRD Open Questions
- **PRD Q1 (Wallet Top-Up):** Implemented via `TopUpModal.jsx` and an inline top-up button, restoring test balances to $250 immediately upon exhaustion.
- **PRD Q2 (Multi-Item Bundles):** Supported via `PayAICartItem` snapshots aggregated into a unified landed-cost table inside `pricingService.js`.
- **PRD Q3 (PayPal Sandbox Friction):** Addressed by defaulting to the Internal Ledger Wallet while offering PayPal Sandbox as an optional toggle.

---

*Technical specification approved for `devpost/spec.md`. Ready for Stage 5 (`5-build`).*
