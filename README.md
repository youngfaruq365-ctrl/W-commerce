# W-Commerce × PayAI

> **An AI-Native Conversational Marketplace & Commerce Intelligence Platform for Emerging Markets**

Built with Google Gemini 2.0 Flash, React 18, Node.js Express, Prisma, Socket.IO, and Cloudinary.

---

## 🌟 Overview

**W-Commerce** transforms the online buying and selling experience by putting **conversational AI at the center of the marketplace**. Through **PayAI**, shoppers don't just browse lists of items—they chat naturally to discover products, negotiate real-time prices with AI agents, check out with dual-currency support (NGN/USD), and track orders via live delivery radar.

### Key Highlights
- **💬 PayAI Shopping Orchestrator**: Natural-language conversational search, semantic intent classification (30+ commerce tools), and personalized smart suggestions.
- **🤝 Autonomous Dynamic Negotiation**: Real-time algorithmic price negotiation adhering to seller minimum acceptable price (MAP) floors.
- **🛰️ Live Delivery Radar**: Real-time 7-milestone order tracking with Socket.IO updates, carrier waybill tracking, and interactive dispute handling.
- **🏪 4-Way Multi-Role Engine**: Dedicated tailored experiences for **Buyers**, **Sellers**, **Couriers**, and **Admins**.
- **🎥 Video-First Product Display**: Cloudinary-powered video thumbnail generation with seamless hover-to-play video integration.
- **📱 PWA & Offline Support**: Workbox-powered service worker caching for seamless mobile browsing in low-connectivity areas.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Lucide React, PWA (Workbox) |
| **Backend** | Node.js, Express.js (CommonJS), Socket.IO, Winston |
| **Database & ORM** | PostgreSQL / SQLite, Prisma ORM |
| **AI & LLM** | Google Gemini 2.0 Flash API |
| **Media & Storage** | Cloudinary (smart video-to-thumbnail pipeline, photo transformations) |
| **Payments** | PayPal REST SDK, Paystack, Monnify, Internal Wallet |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** >= 18.x
- **npm** or **pnpm**
- **Git**

### 2. Installation & Setup

Clone the repository:
```bash
git clone https://github.com/youngfaruq365-ctrl/w-commerce-payai.git
cd w-commerce-payai
```

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Gemini API key and credentials
npx prisma generate
npm run dev
```

#### Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Visit `http://localhost:5175` to explore the app.

---

## 📂 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/      # REST API route controllers
│   │   ├── services/payai/   # PayAI Orchestrator, negotiation & catalog search
│   │   ├── routes/           # Express API endpoints
│   │   ├── middleware/       # Auth, upload, CSRF, audit logging
│   │   └── utils/            # Prisma client, image helpers, logger
│   └── server.cjs            # Backend server entry point
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI, PayAI Product Cards, Tracker
│   │   ├── pages/            # PayAI, Auth, Storefront, Dashboards
│   │   ├── store/            # Zustand global stores (auth, cart, UI)
│   │   └── utils/            # Image helpers, API & Socket clients
│   └── vite.config.ts        # Vite + PWA configuration
└── database/                 # Prisma schemas & migrations
```

---

## 🔒 Security & Privacy

- All sensitive secrets (`.env`, `.env.*`) and development databases are strictly excluded via `.gitignore`.
- Password hashing with `bcrypt` and biometric passkey support via WebAuthn (FIDO2).
- Security headers enabled via `helmet`, CORS validation, and rate limiting on sensitive routes.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
