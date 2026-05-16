import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client even with placeholder values to prevent app crash
// The app will show appropriate error messages when trying to authenticate
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'employee' | 'manager' | 'admin';
          manager_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role?: 'employee' | 'manager' | 'admin';
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: 'employee' | 'manager' | 'admin';
          manager_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      goal_cycles: {
        Row: {
          id: string;
          year: number;
          phase_name: string;
          window_open_date: string;
          window_close_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          phase_name: string;
          window_open_date: string;
          window_close_date: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          phase_name?: string;
          window_open_date?: string;
          window_close_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          employee_id: string;
          goal_cycle_id: string;
          title: string;
          description: string | null;
          thrust_area: string;
          uom_type: 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';
          target_value: number | null;
          target_date: string | null;
          weightage: number;
          status: 'draft' | 'submitted' | 'approved' | 'returned';
          is_shared: boolean;
          is_locked: boolean;
          manager_comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          goal_cycle_id: string;
          title: string;
          description?: string | null;
          thrust_area: string;
          uom_type: 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';
          target_value?: number | null;
          target_date?: string | null;
          weightage: number;
          status?: 'draft' | 'submitted' | 'approved' | 'returned';
          is_shared?: boolean;
          is_locked?: boolean;
          manager_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          goal_cycle_id?: string;
          title?: string;
          description?: string | null;
          thrust_area?: string;
          uom_type?: 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';
          target_value?: number | null;
          target_date?: string | null;
          weightage?: number;
          status?: 'draft' | 'submitted' | 'approved' | 'returned';
          is_shared?: boolean;
          is_locked?: boolean;
          manager_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shared_goal_assignments: {
        Row: {
          id: string;
          source_goal_id: string;
          assigned_to: string;
          weightage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_goal_id: string;
          assigned_to: string;
          weightage: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_goal_id?: string;
          assigned_to?: string;
          weightage?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          goal_id: string;
          shared_goal_assignment_id: string | null;
          quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          actual_value: number | null;
          actual_date: string | null;
          progress_status: 'not_started' | 'on_track' | 'completed';
          score: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          shared_goal_assignment_id?: string | null;
          quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          actual_value?: number | null;
          actual_date?: string | null;
          progress_status?: 'not_started' | 'on_track' | 'completed';
          score?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          shared_goal_assignment_id?: string | null;
          quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          actual_value?: number | null;
          actual_date?: string | null;
          progress_status?: 'not_started' | 'on_track' | 'completed';
          score?: number | null;
          updated_at?: string;
        };
      };
      checkin_comments: {
        Row: {
          id: string;
          achievement_id: string;
          manager_id: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          achievement_id: string;
          manager_id: string;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          achievement_id?: string;
          manager_id?: string;
          comment?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          changed_by: string;
          old_data: any;
          new_data: any;
          changed_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          changed_by: string;
          old_data?: any;
          new_data?: any;
          changed_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action?: string;
          changed_by?: string;
          old_data?: any;
          new_data?: any;
          changed_at?: string;
        };
      };
    };
  };
};
