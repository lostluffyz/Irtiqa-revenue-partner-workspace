# Architecture

**Revenue Partner Workspace — Irtiqa AI**
**Document version:** 1.0
**Last updated:** 2026-07-13

---

## 1. Overview

A lightweight internal web portal for Revenue Partners participating in a 30-Day Revenue Partner Program. Replaces spreadsheets, WhatsApp reporting, and manual lead distribution.

**Constraints:**
- NOT a CRM
- NOT sales management software
- No speculative features
- Two roles only: Admin, Revenue Partner

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) | Server-rendered React, API routes, middleware |
| **Language** | TypeScript (strict) | Type safety across the stack |
| **Styling** | Tailwind CSS | Utility-first, responsive, fast |
| **Database** | Supabase PostgreSQL | Relational data with RLS |
| **Auth** | Supabase Auth | Managed authentication, session cookies |
| **Storage** | Supabase Storage | Document/resource file hosting |
| **Deployment** | Vercel | Edge network, zero-config serverless |
| **Package Mgr** | npm | Standard Node.js package management |

## 3. Application Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser                           │
├──────────────────────────────────────────────────────┤
│                    Vercel (Edge + Serverless)         │
│  ┌─────────────────────────────────────────────────┐ │
│  │        Next.js App Router                       │ │
│  │  ┌──────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │Pages │  │Middleware │  │  API Routes      │  │ │
│  │  │(RSC) │  │(Auth Gate)│  │  (Server Actions)│  │ │
│  │  └──────┘  └──────────┘  └──────────────────┘  │ │
│  └─────────────────────────────────────────────────┘ │
│                         │                              │
│                         ▼                              │
│              ┌─────────────────────┐                   │
│              │   Supabase Client   │                   │
│              │  (Server-side via   │                   │
│              │   @supabase/ssr)    │                   │
│              └─────────┬───────────┘                   │
└────────────────────────┼──────────────────────────────┘
                         │
                         ▼
          ┌─────────────────────────────┐
          │       Supabase Project      │
          │  ┌──────┐ ┌──────┐ ┌─────┐ │
          │  │ Auth  │ │  PG  │ │Stor.│ │
          │  │       │ │+ RLS │ │     │ │
          │  └──────┘ └──────┘ └─────┘ │
          └─────────────────────────────┘
```

### Key Architectural Decisions

#### 3.1 Server Components First
- All pages are React Server Components by default
- Data fetching happens on the server via Supabase server client
- Client Components used only where interactivity is required (forms, status updates, navigation)
- Minimizes client-side JavaScript and data exposure

#### 3.2 Route Protection via Middleware
- Next.js Middleware checks session validity on every request
- Protected route groups redirect to login if unauthenticated
- Role-based access enforced at middleware level for route groups

#### 3.3 Server Actions for Mutations
- All data modifications go through Next.js Server Actions
- Server-side authorization checks before any mutation
- Never exposes Supabase service_role key to the client

#### 3.4 Supabase SSR Pattern
- Uses `@supabase/ssr` package for cookie-based session management
- Server client instance created per-request via `createServerClient`
- Browser client created once via `createBrowserClient`
- Middleware refreshes session cookies on each request

## 4. Route Structure

```
/ (landing -> redirect to login or dashboard)

/(auth)
├── /login                        Auth page
└── /forgot-password              Password reset (admin only)

/(dashboard)
├── /admin                        Admin dashboard
│   ├── /admin/partners           Partner management
│   ├── /admin/partners/[id]      Partner detail
│   ├── /admin/leads              Lead management
│   ├── /admin/leads/upload       Lead upload
│   ├── /admin/reports            Daily reports view
│   ├── /admin/activity           User activity log
│   ├── /admin/statistics         Statistics
│   ├── /admin/announcements      Announcement management
│   └── /admin/resources          Resource management
│
├── /partner                      Partner dashboard
│   ├── /partner/leads            My assigned leads
│   ├── /partner/reports          Daily report submission
│   ├── /partner/progress         My progress metrics
│   ├── /partner/resources        Resources
│   └── /partner/announcements    Announcements

/api
├── /api/auth/...                 Auth endpoints
├── /api/admin/...                Admin API routes
└── /api/partner/...              Partner API routes
```

## 5. Component Architecture

```
src/
├── app/              Next.js App Router pages
├── components/
│   ├── ui/           Reusable UI primitives (Button, Input, Card, Table, etc.)
│   ├── forms/        Form components (LeadForm, ReportForm, etc.)
│   ├── layout/       Layout components (Sidebar, Header, etc.)
│   └── shared/       Shared business components (LeadTable, ReportCard, etc.)
├── lib/
│   ├── supabase/     Supabase client instances (browser, server, admin)
│   ├── utils/        Utility functions
│   └── validations/  Form validation schemas (Zod)
├── hooks/            Custom React hooks
└── types/            TypeScript type definitions
```

## 6. Data Flow

### Read Operations
```
Page (RSC) → createServerClient() → Supabase RLS → Row Filtered Data
```

### Write Operations
```
Client Form → Server Action → Authorization Check → Supabase RLS → Mutation
```

### Authentication Flow
```
Login Form → createServerClient().auth.signInWithPassword()
          → Supabase Auth Verifies → Session Cookie Set
          → Middleware Reads Cookie → Route Based on Role
```

## 7. Styling Approach

- Tailwind CSS utility classes exclusively
- Color palette: Blue (#2563EB, #3B82F6, #1D4ED8) + White + Neutral grays
- Responsive: mobile-first design
- No CSS-in-JS libraries
- No animation frameworks
- Single `/src/app/globals.css` for base styles and Tailwind directives

## 8. Deployment Architecture

```
Vercel:
├── Production: main branch → revenue-partner.vercel.app
├── Preview: PR-based preview deployments
└── Environment Variables:
    ├── NEXT_PUBLIC_SUPABASE_URL
    ├── NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    └── SUPABASE_SECRET_KEY (server-side only)
```

## 9. Error Handling Strategy

- Server Components: error.tsx boundary per route segment
- API Routes: try/catch with typed error responses
- Server Actions: return `{ success, error, data }` typed responses
- Client: toast notifications for create/update/delete operations
- Global: not-found.tsx and global-error.tsx

## 10. Monitoring Considerations

- Vercel Analytics for page views and web vitals
- Supabase Dashboard for database queries and auth events
- No custom monitoring in MVP scope
