---
doc: scope
status: approved
---

# W-Commerce PayAI

Cross-border AI commerce engine with cultural taste-matching, real-time price negotiation, and progressive milestone escrow protection.

## The Unique Kernel

Cross-domain Cultural TasteMatch (inspired by Qloo) coupled with an autonomous AI sales negotiator that dynamically binds agreed prices and multi-day delivery milestones directly to smart escrow locking and disbursement. 

Unlike traditional e-commerce platforms where search is keyword-rigid, prices are non-negotiable, and cross-border buyers bear 100% of the delivery risk upfront, W-Commerce PayAI unifies cultural discovery, real-time agentic bargaining, and fraud-proof milestone escrow into a single trusted transaction loop.

## Who It's For

Global shoppers and cross-border artisans/merchants seeking authentic cultural products (fashion, artisanal crafts, culinary specialties) who currently face steep trust barriers, currency conversion obscurity, and fear of non-delivery.

- **For Buyers:** Discerning cross-border shoppers wanting culturally specific goods (e.g., handcrafted African textiles, Japanese bespoke ceramic ware, Nordic heritage woolens) without fear of being scammed, hit with surprise landed tariffs, or left helpless if an international parcel vanishes in transit. Today, they rely on chaotic Instagram DMs, insecure direct bank transfers, or overpriced proxy agents.
- **For Merchants & Artisans:** Independent creators who lack 24/7 multi-lingual sales teams and struggle with cross-border customer skepticism. PayAI gives them an autonomous sales negotiator acting within strict profit-floor bounds, converting international visitors and guaranteeing payment disbursement as verified delivery milestones are met.

## The Core Loop

1. **Taste Discovery:** Buyer inputs an aesthetic or cultural palate prompt (e.g., *"Lagos street style meets Tokyo minimalist techwear"*).
2. **Affinity Matching:** PayAI computes cross-domain cultural affinity scores across catalog items, serving curated recommendations with contextual cultural rationale.
3. **Agentic Negotiation:** Buyer initiates conversational bargaining on pricing, volume bundles, or shipping terms; the seller agent negotiates dynamically within predefined margin limits.
4. **Landed-Cost Clarity:** Agent outputs an itemized Markdown landed-cost card detailing item base price, calculated customs/tariffs, shipping, and total savings.
5. **Milestone Escrow Lock:** Buyer accepts the negotiated terms; payment is authorized and locked into a multi-stage escrow contract via PayPal Sandbox or simulated digital wallet.
6. **Progressive Disbursement:** As verified logistics milestones occur (`IN_TRANSIT` -> `DELIVERED`), funds are automatically disbursed to the merchant, eliminating buyer risk and seller non-payment anxiety.

**Why they return:** Buyers experience zero-friction cultural discovery with complete financial security, while merchants gain an automated, tireless global sales pipeline that protects margins and guarantees escrow settlements.

## Inspiration & Identity

- **[Qloo](https://qloo.com):** Cultural AI intelligence and taste mapping that connects music, fashion, cuisine, and geography into rich taste correlations.
- **[Shopify](https://shopify.com):** Independent merchant empowerment, catalog autonomy, and seamless commercial workflows.
- **[Escrow.com](https://escrow.com):** Trust architecture and multi-stage milestone dispute prevention for high-value and cross-border transactions.
- **Aesthetic & Mood:** High-trust fintech sophistication meets warm global cultural flair. Dark slate backgrounds (`#0f172a`, `#1e293b`), emerald green accents (`#10b981`), crisp monospaced pricing badges, smooth micro-interactions, and transparent landed-cost comparison tables.

## Why This Matters to the Learner

Demonstrates that AI agents can graduate from static conversational chatbots into trustworthy, autonomous economic actors that bridge cross-cultural commerce. By combining generative language reasoning with deterministic margin constraints and a finite-state escrow ledger, this project tackles real-world cross-border trade friction with architectural rigor.

## What "Working" Looks Like

A buyer opens W-Commerce PayAI in their browser and types: *"Lagos street style meets Tokyo minimalist techwear."* 

Within seconds:
1. PayAI returns curated artisan products tagged with cultural affinity scores (e.g., *"94% Cultural Affinity: Hand-dyed indigo kimono jacket with street utility pockets"*).
2. The buyer clicks "Negotiate Bundle" and proposes a multi-item discount.
3. The AI sales agent evaluates the proposal against merchant profit thresholds, counters with a fair bundle offer, and outputs an itemized Markdown landed-cost table showing item breakdown, estimated customs, express shipping, and final total.
4. The buyer clicks "Accept & Lock in Escrow." The transaction transitions to `LOCKED` in escrow.
5. The live dashboard displays the progressive escrow pipeline (`LOCKED` -> `IN_TRANSIT` -> `DELIVERED` -> `DISBURSED`), allowing the user to trigger milestone simulations and verify that merchant funds disburse only upon confirmed delivery.

## The POC Boundary

### Now (In POC)
- **Cultural TasteMatch Engine:** Multi-attribute cultural affinity matching linking disparate geographic and aesthetic descriptors to catalog items.
- **Autonomous Negotiation Agent:** Conversational LLM-driven negotiation loop with strict deterministic floor pricing, counter-offer logic, and bundle discounts.
- **Landed-Cost Markdown Generator:** Dynamic rendering of itemized landed-cost breakdown tables with shipping and tariff estimations.
- **Milestone Escrow State Machine:** 4-state deterministic ledger (`LOCKED` -> `IN_TRANSIT` -> `DELIVERED` -> `DISBURSED`) with state transition guards.
- **Simulated Payment & Escrow Wallet:** Dual-mode checkout with PayPal Sandbox integration and internal simulated merchant/buyer ledger for instant verification.
- **Interactive Single-Page UI:** Clean responsive dark-fintech interface featuring real-time negotiation chat and live escrow milestone progression tracker.

### Later
- **Multi-Currency Crypto Settlement:** Smart contract escrow deployment on low-cost L2 blockchains (USDC on Solana or Base).
- **Live Customs Tariff API:** Real-time Harmonized System (HS) code lookup and automated import duty calculation via official governmental customs APIs.
- **Native Mobile Experience:** Push-notification enabled iOS and Android apps for milestone tracking and real-time counter-offer alerts.
- **Merchant Storefront Integrations:** Direct two-way catalog and inventory sync with Shopify, WooCommerce, and Etsy.

### Explicitly Cut
- **Multi-Party Legal Arbitration Tribunal:** Formal multi-arbitrator evidence courts are out of scope for a 2–4 hour hackathon build. Replaced with an automated buyer/seller dispute resolution window with preset time-out settlement.
- **Live GPS Courier Telematics Integration:** Direct hardware/satellite carrier API integration is cut due to authentication friction and third-party credential dependencies. Simulated via realistic webhook event triggers with carrier tracking numbers.
- **Legacy Fiat Wire Transfers:** ACH/SWIFT slow-clearing legacy bank wire integrations cut to avoid multi-day asynchronous settlement delays; focused strictly on instantaneous digital authorization and sandbox escrow locks.
