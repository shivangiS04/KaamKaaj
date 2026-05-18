# KaamKaaj Architecture

## Project Links

- **GitHub Repository:** https://github.com/shivangiS04/KaamKaaj
- **Deployed Application:** https://kaam-kaaj-blue.vercel.app/login

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer (Browser)"]
        UI["React 18 + TypeScript + Vite"]
        TW["Tailwind CSS + Lucide Icons"]
        RC["Recharts Analytics"]
        RR["React Router v6"]
    end

    subgraph Vercel["☁️ Vercel (Free Tier - ₹0/month)"]
        CDN["Global CDN + Edge Network"]
        SPA["SPA Hosting + vercel.json Rewrites"]
        SF["Serverless Function: /api/send-email"]
    end

    subgraph Supabase["🗄️ Supabase (Free Tier - ₹0/month)"]
        AUTH["Supabase Auth (JWT + Email)"]
        DB["PostgreSQL Database"]
        REST["Auto-generated REST API"]
        RLS["Row Level Security Policies"]
        
        subgraph Tables["Database Tables"]
            T1["profiles (users + roles)"]
            T2["goals (goal sheets)"]
            T3["goal_cycles (active cycles)"]
            T4["achievements (quarterly data)"]
            T5["checkin_comments (feedback)"]
            T6["audit_logs (change trail)"]
            T7["shared_goal_assignments"]
        end
    end

    subgraph Resend["📧 Resend API (Free Tier)"]
        EMAIL["Transactional Emails"]
    end

    subgraph Roles["👥 User Roles"]
        EMP["Employee\n- Create goals\n- Log achievements\n- View analytics"]
        MGR["Manager (L1)\n- Approve/Return goals\n- Check-in comments\n- Team dashboard"]
        ADM["Admin/HR\n- Cycle management\n- User management\n- Audit logs + Reports"]
    end

    EMP --> UI
    MGR --> UI
    ADM --> UI
    UI --> TW
    UI --> RC
    UI --> RR
    UI --> CDN
    CDN --> SPA
    SPA --> AUTH
    SPA --> REST
    REST --> RLS
    RLS --> DB
    DB --> Tables
    SF --> EMAIL
    UI --> SF
```

## Tech Stack Summary
| Layer | Technology | Cost |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Free |
| Styling | Tailwind CSS + Lucide Icons | Free |
| Charts | Recharts | Free |
| Hosting | Vercel Free Tier | ₹0/month |
| Database | Supabase PostgreSQL | ₹0/month |
| Auth | Supabase Auth (JWT) | ₹0/month |
| Email | Resend Free Tier | ₹0/month |
| **Total** | **Full production stack** | **₹0/month** |

## Cost Optimization Strategy
- Vercel free tier: 100GB bandwidth, unlimited deployments
- Supabase free tier: 500MB database, 50,000 monthly active users
- Zero server maintenance — fully managed serverless
- Auto-scaling with no configuration needed
- Total monthly cost scales to ₹0 until 50,000 MAU

## Security Architecture
- Supabase Row Level Security (RLS) on all tables
- JWT-based authentication with automatic token refresh
- Role-based access control (Employee / Manager / Admin)
- Protected routes on frontend via ProtectedRoute component
- API keys stored as environment variables, never exposed to client

## Data Flow
1. User logs in → Supabase Auth issues JWT token
2. Frontend sends JWT with every API request
3. Supabase RLS validates JWT and enforces row-level permissions
4. Employee data isolated — users can only see their own records
5. Manager data scoped to their direct reports only
6. Admin has full access via elevated RLS policies

## Bonus Features Implemented
- Analytics Dashboard (bar chart, pie chart, QoQ line chart)
- Manager Effectiveness Overview
- Escalation Alerts for HR
- Check-in Window Enforcement (Admin controlled)
- Shared Goals across employees
- Complete Audit Trail post goal-lock
- CSV Export for achievement reports
- Skeleton loaders for all pages
- One-click demo login on landing page
