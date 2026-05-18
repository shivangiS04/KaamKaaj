-- Goal Setting & Tracking Portal Database Schema
-- Supabase PostgreSQL with Row-Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE goal_status AS ENUM ('draft', 'submitted', 'approved', 'returned');
CREATE TYPE uom_type AS ENUM ('numeric_min', 'numeric_max', 'timeline', 'zero');
CREATE TYPE progress_status AS ENUM ('not_started', 'on_track', 'completed');
CREATE TYPE quarter_type AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- 1. PROFILES TABLE
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'employee',
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GOAL_CYCLES TABLE
CREATE TABLE goal_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    window_open_date DATE NOT NULL,
    window_close_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (window_open_date < window_close_date),
    CONSTRAINT single_active_cycle EXCLUDE (is_active WITH =) WHERE (is_active = TRUE)
);

-- 3. GOALS TABLE
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_cycle_id UUID NOT NULL REFERENCES goal_cycles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    thrust_area TEXT NOT NULL,
    uom_type uom_type NOT NULL,
    target_value NUMERIC,
    target_date DATE,
    weightage INTEGER NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    status goal_status DEFAULT 'draft',
    is_shared BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    manager_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SHARED_GOAL_ASSIGNMENTS TABLE
CREATE TABLE shared_goal_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    weightage INTEGER NOT NULL CHECK (weightage >= 0 AND weightage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_goal_id, assigned_to)
);

-- 5. ACHIEVEMENTS TABLE
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    shared_goal_assignment_id UUID REFERENCES shared_goal_assignments(id) ON DELETE CASCADE,
    quarter quarter_type NOT NULL,
    actual_value NUMERIC,
    actual_date DATE,
    progress_status progress_status DEFAULT 'not_started',
    score NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(goal_id, shared_goal_assignment_id, quarter)
);

-- 6. CHECKIN_COMMENTS TABLE
CREATE TABLE checkin_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. AUDIT_LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    metadata JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY POLICIES

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Managers can view their team members' profiles
CREATE POLICY "Managers can view team profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND manager_id = auth.uid()
    );

-- GOAL_CYCLES RLS POLICIES
-- All authenticated users can view goal cycles
CREATE POLICY "Authenticated users can view goal cycles" ON goal_cycles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can insert goal cycles
CREATE POLICY "Admins can insert goal cycles" ON goal_cycles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update goal cycles
CREATE POLICY "Admins can update goal cycles" ON goal_cycles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- GOALS RLS POLICIES
-- Employees can view their own goals and shared goals assigned to them
CREATE POLICY "Employees can view own goals" ON goals
    FOR SELECT USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM shared_goal_assignments
            WHERE source_goal_id = goals.id AND assigned_to = auth.uid()
        )
    );

-- Employees can insert their own goals
CREATE POLICY "Employees can insert own goals" ON goals
    FOR INSERT WITH CHECK (employee_id = auth.uid());

-- Employees can update their own goals if not locked
CREATE POLICY "Employees can update own goals" ON goals
    FOR UPDATE USING (
        employee_id = auth.uid() AND 
        (is_locked = FALSE OR status IN ('draft', 'returned'))
    );

-- Managers can view goals of their team members
CREATE POLICY "Managers can view team goals" ON goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND employee_id IN (
            SELECT id FROM profiles WHERE manager_id = auth.uid()
        )
    );

-- Managers can update team goals
CREATE POLICY "Managers can update team goals" ON goals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND employee_id IN (
            SELECT id FROM profiles WHERE manager_id = auth.uid()
        )
    );

-- Admins can view all goals
CREATE POLICY "Admins can view all goals" ON goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all goals
CREATE POLICY "Admins can update all goals" ON goals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SHARED_GOAL_ASSIGNMENTS RLS POLICIES
-- Employees can view shared goals assigned to them
CREATE POLICY "Employees can view assigned shared goals" ON shared_goal_assignments
    FOR SELECT USING (assigned_to = auth.uid());

-- Managers can view shared goals for their team
CREATE POLICY "Managers can view team shared goals" ON shared_goal_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND assigned_to IN (
            SELECT id FROM profiles WHERE manager_id = auth.uid()
        )
    );

-- Admins can view all shared goal assignments
CREATE POLICY "Admins can view all shared goals" ON shared_goal_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Managers and Admins can insert shared goals
CREATE POLICY "Managers and Admins can insert shared goals" ON shared_goal_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );

-- ACHIEVEMENTS RLS POLICIES
-- Employees can view their own achievements
CREATE POLICY "Employees can view own achievements" ON achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = achievements.goal_id AND goals.employee_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM shared_goal_assignments
            WHERE shared_goal_assignments.id = achievements.shared_goal_assignment_id
            AND shared_goal_assignments.assigned_to = auth.uid()
        )
    );

-- Employees can insert their own achievements
CREATE POLICY "Employees can insert own achievements" ON achievements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = achievements.goal_id AND goals.employee_id = auth.uid()
        )
    );

-- Employees can update their own achievements
CREATE POLICY "Employees can update own achievements" ON achievements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = achievements.goal_id AND goals.employee_id = auth.uid()
        )
    );

-- Managers can view team achievements
CREATE POLICY "Managers can view team achievements" ON achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND EXISTS (
            SELECT 1 FROM goals 
            WHERE goals.id = achievements.goal_id 
            AND goals.employee_id IN (
                SELECT id FROM profiles WHERE manager_id = auth.uid()
            )
        )
    );

-- Admins can view all achievements
CREATE POLICY "Admins can view all achievements" ON achievements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all achievements
CREATE POLICY "Admins can update all achievements" ON achievements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- CHECKIN_COMMENTS RLS POLICIES
-- Employees can view comments on their achievements
CREATE POLICY "Employees can view own checkin comments" ON checkin_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM achievements 
            WHERE achievements.id = checkin_comments.achievement_id
            AND EXISTS (
                SELECT 1 FROM goals 
                WHERE goals.id = achievements.goal_id AND goals.employee_id = auth.uid()
            )
        )
    );

-- Managers can insert comments on team achievements
CREATE POLICY "Managers can insert checkin comments" ON checkin_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND EXISTS (
            SELECT 1 FROM achievements 
            WHERE achievements.id = checkin_comments.achievement_id
            AND EXISTS (
                SELECT 1 FROM goals 
                WHERE goals.id = achievements.goal_id 
                AND goals.employee_id IN (
                    SELECT id FROM profiles WHERE manager_id = auth.uid()
                )
            )
        )
    );

-- Managers can view team checkin comments
CREATE POLICY "Managers can view team checkin comments" ON checkin_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'manager'
        ) AND EXISTS (
            SELECT 1 FROM achievements 
            WHERE achievements.id = checkin_comments.achievement_id
            AND EXISTS (
                SELECT 1 FROM goals 
                WHERE goals.id = achievements.goal_id 
                AND goals.employee_id IN (
                    SELECT id FROM profiles WHERE manager_id = auth.uid()
                )
            )
        )
    );

-- Admins can view all checkin comments
CREATE POLICY "Admins can view all checkin comments" ON checkin_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- AUDIT_LOGS RLS POLICIES
-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- NOTIFICATIONS RLS POLICIES
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Managers can insert notifications for their team members
CREATE POLICY "Managers can insert team notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
        ) AND user_id IN (
            SELECT id FROM profiles WHERE manager_id = auth.uid()
        )
    );

-- Admins can insert notifications for anyone
CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for performance
CREATE INDEX idx_goals_employee_id ON goals(employee_id);
CREATE INDEX idx_goals_goal_cycle_id ON goals(goal_cycle_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_achievements_goal_id ON achievements(goal_id);
CREATE INDEX idx_achievements_quarter ON achievements(quarter);
CREATE INDEX idx_shared_goal_assignments_source_goal_id ON shared_goal_assignments(source_goal_id);
CREATE INDEX idx_shared_goal_assignments_assigned_to ON shared_goal_assignments(assigned_to);
CREATE INDEX idx_profiles_manager_id ON profiles(manager_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call handle_new_user on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to log changes to audit_logs
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_record JSONB;
    new_record JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_record := to_jsonb(OLD);
        INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), old_record, NULL);
    ELSIF TG_OP = 'UPDATE' THEN
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), old_record, new_record);
    ELSIF TG_OP = 'INSERT' THEN
        new_record := to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), NULL, new_record);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging on key tables
CREATE TRIGGER log_goals_changes
    AFTER INSERT OR UPDATE OR DELETE ON goals
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER log_achievements_changes
    AFTER INSERT OR UPDATE OR DELETE ON achievements
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER log_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER log_goal_cycles_changes
    AFTER INSERT OR UPDATE OR DELETE ON goal_cycles
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();
