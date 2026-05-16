import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Users, Target, Settings, BarChart3, FileText, Unlock, Download } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeGoals: 0,
    activeCycle: 'None',
    lockedGoals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');
      if (usersError) throw usersError;

      // Fetch active goals
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('status', 'approved');
      if (goalsError) throw goalsError;

      // Fetch active cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('goal_cycles')
        .select('phase_name')
        .eq('is_active', true)
        .single();
      if (cycleError && cycleError.code !== 'PGRST116') throw cycleError;

      // Fetch locked goals
      const { data: lockedGoals, error: lockedError } = await supabase
        .from('goals')
        .select('id')
        .eq('is_locked', true);
      if (lockedError) throw lockedError;

      setStats({
        totalUsers: users?.length || 0,
        activeGoals: goals?.length || 0,
        activeCycle: cycle?.phase_name || 'None',
        lockedGoals: lockedGoals?.length || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Goals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.activeGoals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Cycle</p>
                <p className="text-lg font-semibold text-gray-900">
                  {loading ? '-' : stats.activeCycle}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Unlock className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Locked Goals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.lockedGoals}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <Users className="h-8 w-8 text-indigo-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
            <p className="mt-2 text-sm text-gray-500">Manage users, roles, and reporting lines</p>
          </button>

          <button
            onClick={() => navigate('/admin/cycles')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <Settings className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Cycle Management</h3>
            <p className="mt-2 text-sm text-gray-500">Create and manage goal cycles</p>
          </button>

          <button
            onClick={() => navigate('/admin/unlock')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <Unlock className="h-8 w-8 text-yellow-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Goal Unlock</h3>
            <p className="mt-2 text-sm text-gray-500">Unlock locked goals for corrections</p>
          </button>

          <button
            onClick={() => navigate('/admin/completion')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <BarChart3 className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Completion Dashboard</h3>
            <p className="mt-2 text-sm text-gray-500">View completion statistics</p>
          </button>

          <button
            onClick={() => navigate('/admin/reports')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <Download className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Achievement Report</h3>
            <p className="mt-2 text-sm text-gray-500">Generate and export achievement reports</p>
          </button>

          <button
            onClick={() => navigate('/admin/audit')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <FileText className="h-8 w-8 text-red-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Audit Log Viewer</h3>
            <p className="mt-2 text-sm text-gray-500">View system audit logs</p>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            {stats.lockedGoals > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  You have <strong>{stats.lockedGoals}</strong> locked goal{stats.lockedGoals !== 1 ? 's' : ''} that may need attention.
                </p>
                <button
                  onClick={() => navigate('/admin/unlock')}
                  className="mt-2 text-sm font-medium text-yellow-900 hover:text-yellow-700"
                >
                  Review Locked Goals →
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">All systems operational</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No immediate actions required.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
