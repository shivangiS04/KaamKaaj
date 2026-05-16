import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Users, CheckSquare, FileCheck, MessageSquare } from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({
    teamMembers: 0,
    pendingReviews: 0,
    checkInsDue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch team members count
      const { data: teamMembers, error: teamError } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', profile!.id);

      if (teamError) throw teamError;

      // Fetch pending reviews count
      const teamMemberIds = teamMembers?.map((m) => m.id) || [];
      let pendingCount = 0;

      if (teamMemberIds.length > 0) {
        const { data: pendingGoals, error: pendingError } = await supabase
          .from('goals')
          .select('id')
          .in('employee_id', teamMemberIds)
          .eq('status', 'submitted');

        if (pendingError) throw pendingError;
        pendingCount = pendingGoals?.length || 0;
      }

      setStats({
        teamMembers: teamMembers?.length || 0,
        pendingReviews: pendingCount,
        checkInsDue: 0, // TODO: Calculate based on check-in windows
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
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
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
              <Users className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Team Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.teamMembers}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/manager/team-review')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <FileCheck className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.pendingReviews}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/manager/checkin')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quarterly Check-ins</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? '-' : stats.teamMembers}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Manager Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate('/manager/team-review')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <FileCheck className="h-8 w-8 text-indigo-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Team Goal Review</h3>
            <p className="mt-2 text-sm text-gray-500">
              Review and approve goals submitted by your team members
            </p>
          </button>

          <button
            onClick={() => navigate('/manager/checkin')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <MessageSquare className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Quarterly Check-in</h3>
            <p className="mt-2 text-sm text-gray-500">
              Review team achievements and add check-in comments
            </p>
          </button>
        </div>

        {/* Team Goals Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            {stats.pendingReviews > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  You have <strong>{stats.pendingReviews}</strong> goal{stats.pendingReviews !== 1 ? 's' : ''} pending review.
                </p>
                <button
                  onClick={() => navigate('/manager/team-review')}
                  className="mt-2 text-sm font-medium text-yellow-900 hover:text-yellow-700"
                >
                  Review Now →
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No pending goal reviews at the moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
