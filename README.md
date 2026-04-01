# DJ-AI Wealth Advisor — Frontend

A modern, AI-powered wealth management dashboard built with **React**, **TypeScript**, and **Vite**. Features real-time market data, intelligent portfolio analysis, and an AI-driven financial advisor.

## ✨ Features

- **Smart Dashboard** — Real-time portfolio tracking with live market prices
- **AI Financial Advisor** — Chat with an AI that understands your portfolio and market context
- **Live Voice Mode** — Speak with the AI advisor using voice input
- **Watchlist** — Track and monitor stocks with real-time price feeds
- **Market Overview** — NSE/BSE indices, top gainers/losers, and sector performance
- **Goal Planner** — Set and track financial goals with AI-generated investment plans
- **News Feed** — Market news with AI-powered impact analysis
- **Social Auth** — Sign in with Google or GitHub via Supabase Auth
- **Dark Mode** — Full dark/light theme support

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| Supabase JS | Social authentication (Google, GitHub) |
| Lucide React | Icons |
| Recharts | Portfolio charts |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Gopinath107/ai-wealth.git
cd ai-wealth

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (for social auth) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (legacy JWT format `eyJ...`) | Yes (for social auth) |

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
```

## 🔐 Authentication

The app supports two authentication methods:

1. **Email/Password** — Traditional registration and login
2. **Social Login** — Google and GitHub OAuth via Supabase Auth

### Social Auth Flow

```
User clicks "Continue with Google/GitHub"
  → Supabase redirects to OAuth provider
  → User authenticates
  → Redirects back to /auth/callback
  → Frontend sends Supabase token to backend
  → Backend verifies token, creates/finds user, issues system JWT
  → User is logged in
```

## 📁 Project Structure

```
├── App.tsx                    # Main app with routing
├── index.html                 # Entry HTML
├── index.tsx                  # React entry point
├── types.ts                   # TypeScript type definitions
├── components/
│   ├── Auth.tsx               # Login/Signup with social auth buttons
│   ├── AuthCallback.tsx       # OAuth redirect handler
│   ├── Dashboard.tsx          # Portfolio dashboard
│   ├── Watchlist.tsx          # Stock watchlist
│   ├── Layout.tsx             # App shell layout
│   ├── Advisor/               # AI chat advisor
│   ├── Goals.tsx              # Financial goal planner
│   ├── NewsFeed.tsx           # Market news
│   ├── MarketOverview.tsx     # Market data overview
│   ├── Portfolio.tsx          # Portfolio management
│   ├── Settings.tsx           # User settings
│   └── ...
├── services/
│   ├── api.ts                 # Unified API exports
│   ├── authService.ts         # Auth logic (manual + social)
│   ├── supabaseClient.ts      # Supabase client initialization
│   ├── portfolioService.ts    # Portfolio API
│   ├── marketService.ts       # Market data API
│   └── ...
└── config/
    └── demoUser.ts            # Demo mode configuration
```

## 🌐 Deployment

Deployed on **Vercel**. Set the environment variables in Vercel dashboard under Project Settings → Environment Variables.

## 📄 License

This project is for educational and personal use.
