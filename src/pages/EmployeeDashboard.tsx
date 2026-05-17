import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Target, CheckSquare, Plus } from 'lucide-react';
import { toast } from '../utils/toast';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [goalsCount, setGoalsCount] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [statusLabel, setStatusLabel] = useState('No Goals');
  const [previewGoals, setPreviewGoals] = useState<{ id: string; title: string; status: string }[]>([]);

  useEffect(() => {
    if (!profile) return;

    const fetchStats = async () => {
      try {
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('id, title, status, updated_at')
          .eq('employee_id', profile.id)
          .order('updated_at', { ascending: false });

        if (goalsError) throw goalsError;

        const totalGoals = (goals || []).length;
        setGoalsCount(totalGoals);
        setPreviewGoals((goals || []).slice(0, 3).map((g) => ({ id: g.id, title: g.title, status: g.status })));

        if (totalGoals === 0) {
          setStatusLabel('No Goals');
          setAchievementsCount(0);
          setPreviewGoals([]);
          return;
        }

        const allApproved = (goals || []).every((g) => g.status === 'approved');
        const mostRecentStatus = goals?.[0]?.status ?? 'draft';
        const nextStatus = allApproved ? 'approved' : mostRecentStatus;
        setStatusLabel(`${nextStatus.charAt(0).toUpperCase()}${nextStatus.slice(1)}`);

        const goalIds = (goals || []).map((g) => g.id);
        const { data: achievements, error: achievementsError } = await supabase
          .from('achievements')
          .select('goal_id')
          .in('goal_id', goalIds)
          .or('actual_value.not.is.null,actual_date.not.is.null');

        if (achievementsError) throw achievementsError;

        const uniqueGoalIds = new Set((achievements || []).map((a) => a.goal_id));
        setAchievementsCount(uniqueGoalIds.size);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      }
    };

    fetchStats();
  }, [profile]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {profile?.name}</span>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">My Goals</p>
                <p className="text-2xl font-semibold text-gray-900">{goalsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Achievements</p>
                <p className="text-2xl font-semibold text-gray-900">{achievementsCount}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/employee/achievements')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <CheckSquare className="h-8 w-8 text-blue-600 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Input Achievements</h3>
            <p className="text-sm text-gray-500">Update quarterly progress</p>
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Plus className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-2xl font-semibold text-gray-900">{statusLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">My Goals</h2>
            <button
              onClick={() => navigate('/employee/goals')}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {previewGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No goals yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first goal for the current cycle.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => navigate('/employee/goals/create')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Goal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {previewGoals.map((g) => (
                  <div key={g.id} className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{g.status}</p>
                    </div>
                    <button
                      onClick={() => navigate('/employee/goals')}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
