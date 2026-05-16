# Goal Setting & Tracking Portal

A production-ready web application for corporate goal setting and quarterly performance tracking, built for hackathons.

## Overview

This portal enables employees to set quarterly goals, managers to review and approve those goals, and administrators to manage the entire goal-setting cycle. The system supports three distinct user roles with role-specific dashboards and workflows.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Row-Level Security + Auth)
- **Charts**: Recharts
- **Hosting**: Vercel (frontend)
- **Email**: Resend.com (bonus feature)

## Features

### Employee Features
- Goal creation with validation (100% total weightage, 10% min per goal, max 8 goals)
- My Goals page with status tracking (Draft/Submitted/Approved/Returned)
- Quarterly achievement input with auto-computed scores
- Support for 4 UoM types: Numeric Min/Max, Timeline, Zero-based

### Manager Features
- Team goal review dashboard
- Goal approval workflow (approve or return with comments)
- Quarterly check-in module with historical comments
- Inline editing of goals before approval

### Admin Features
- User management (roles, reporting lines, invites)
- Goal cycle management
- Goal unlock capability with audit logging
- Completion dashboard with real-time statistics
- Achievement report with CSV export
- Audit log viewer

### Advanced Features
- Shared goals (push goals to multiple employees)
- Check-in schedule enforcement (quarterly windows)
- Row-Level Security (RLS) for data access control
- Automatic audit logging for all changes
- Analytics dashboard with charts (bonus)
- Email notifications (bonus)

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@demo.com | Admin@123 |
| **Manager** | manager1@demo.com | Manager@123 |
| **Employee** | employee1@demo.com | Employee@123 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Vercel)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Employee   │  │   Manager    │  │    Admin     │      │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   React Router v6                            │
│                   Auth Context                               │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    Supabase Client
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                      │   │
│  │  • profiles          • achievements                   │   │
│  │  • goal_cycles       • checkin_comments               │   │
│  │  • goals             • audit_logs                     │   │
│  │  • shared_goal_assignments                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Row-Level Security (RLS) Policies             │   │
│  │  • Employee: Own goals only                           │   │
│  │  • Manager: Team goals + own goals                    │   │
│  │  • Admin: All goals                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase Auth                            │   │
│  │  • Email/Password authentication                      │   │
│  │  • Session management                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   └── ProtectedRoute.tsx
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Third-party integrations
│   │   └── supabase.ts
│   ├── pages/               # Route components
│   │   ├── Login.tsx
│   │   ├── EmployeeDashboard.tsx
│   │   ├── GoalCreation.tsx
│   │   ├── MyGoals.tsx
│   │   ├── AchievementInput.tsx
│   │   ├── ManagerDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── utils/               # Utility functions
│   │   ├── scoreCalculator.ts
│   │   ├── csvExport.ts
│   │   └── toast.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── schema.sql           # Database schema with RLS
│   └── seed.sql             # Seed data script
└── docs/
    └── architecture.md      # Detailed architecture diagram
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd atomquest-hackathon
```

### 2. Install Dependencies

```bash
npm install
```

**Note**: This project uses Vite 5.4.11 which is compatible with Node.js 20.x. If you encounter build errors, check your Node version:

```bash
node --version
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/schema.sql`
3. **Create demo users via Supabase Dashboard** (Authentication > Users):
   - Click "Add User" → "Create new user"
   - Enter email and password from demo credentials above
   - **IMPORTANT**: Check "Auto Confirm User" option
   - Repeat for all 3 demo users
4. **Sync profiles with auth users**:
   - Run `supabase/sync_profiles.sql` to create profile records with correct user IDs
5. **Create a goal cycle**:
   - Run `supabase/create_cycle.sql` to create the 2024 annual cycle

**Note**: Users MUST be created via the Supabase Dashboard UI with "Auto Confirm User" enabled. Creating users via SQL will fail due to email confirmation requirements.

### 4. Configure Environment Variables

Create `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**IMPORTANT**: Ensure there are no spaces around the `=` sign in the `.env` file.

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal) and log in with demo credentials.

## Testing the Application

### Test Goal Creation (Example Data)

When creating goals as an employee, use these examples:

1. **Goal 1:** Increase quarterly revenue by 15%
   - Category: Revenue Growth
   - Type: Numeric Min
   - Target: 15
   - Weightage: 40%

2. **Goal 2:** Reduce customer support response time to under 2 hours
   - Category: Customer Satisfaction
   - Type: Numeric Max
   - Target: 2
   - Weightage: 30%

3. **Goal 3:** Launch new product feature by Q2 end
   - Category: Product Innovation
   - Type: Timeline
   - Target Date: June 30, 2024
   - Weightage: 30%

### Employee Journey
1. Log in as `employee1@demo.com`
2. Create goals (ensure total weightage = 100%)
3. Submit for approval
4. View goals in My Goals page

### Manager Journey
1. Log in as `manager1@demo.com`
2. Review submitted goals from team members
3. Approve or return goals with comments
4. Add quarterly check-in comments

### Admin Journey
1. Log in as `admin@demo.com`
2. Manage users and assign roles
3. Create/activate goal cycles
4. View completion dashboard
5. Export achievement reports as CSV
6. View audit logs

## Score Calculation

### Numeric Min (Higher is Better)
```
score = (actual_value / target_value) * 100
Example: Target 100, Actual 120 → Score = 120%  (capped at 100%)
```

### Numeric Max (Lower is Better)
```
score = (target_value / actual_value) * 100
Example: Target 5, Actual 3 → Score = 166.67% (capped at 100%)
```

### Timeline (Date-Based)
```
score = actual_date <= target_date ? 100% : 0%
Example: Target 2024-12-31, Actual 2024-12-15 → Score = 100%
```

### Zero-Based
```
score = actual_value === 0 ? 100% : 0%
Example: Target 0, Actual 0 → Score = 100%
```

## Deployment

### Deploy to Vercel

```bash
npm run build
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Validation Rules

- Total weightage must equal exactly 100%
- Each goal minimum weightage: 10%
- Maximum 8 goals per employee per cycle
- Timeline goals require target date
- Numeric goals require target value
- Goals locked after manager approval
- Achievement input only during check-in windows

## Security

- Row-Level Security (RLS) enforced on all tables
- No admin keys exposed on frontend
- Role-based access control
- Audit logging for all critical changes
- Protected routes with authentication checks

## CSV Export Format

Achievement reports include:
- Employee Name & Email
- Manager Name
- Goal Title & Thrust Area
- UoM Type & Target
- Q1-Q4 Actual Values
- Progress Status & Score
- Cycle Year & Phase

## UI/UX Features

- Clean, minimalist design with Tailwind CSS
- Responsive (desktop & tablet)
- Loading states on all async operations
- Toast notifications for user feedback
- Inline validation error messages
- Empty states with clear CTAs
- Status badges (Draft/Submitted/Approved/Returned)
- Color-coded completion indicators

## Troubleshooting

### "No active goal cycle found"
- Admin needs to create and activate a goal cycle
- Run `supabase/create_cycle.sql` to create the 2024 cycle

### "Check-in window is closed"
- Achievement input only allowed during quarterly windows
- Admin can override restrictions

### Login Issues / Profile Not Found
- Ensure users were created via Supabase Dashboard with "Auto Confirm User" enabled
- Run `supabase/sync_profiles.sql` to sync profile IDs with auth.users IDs
- Check that there are no spaces in `.env` file around the `=` sign

### RLS Policy Errors (Currently Disabled for Testing)
- RLS is currently disabled on all tables for easier testing
- To enable RLS, run the appropriate SQL commands in Supabase SQL Editor
- Ensure users have correct roles in profiles table
- Check manager_id relationships are set correctly

## License

MIT License - Built for AtomQuest Hackathon

---

Made with care by Shivangi Singh
