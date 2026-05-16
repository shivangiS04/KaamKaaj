import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Lock, CheckCircle, Clock, AlertCircle, Send, Users } from 'lucide-react';
import { fetchSharedGoalsForEmployee, type SharedGoalView } from '../utils/sharedGoals';

interface Goal {
  id: string;
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
}

const STATUS_BADGES = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Draft' },
  submitted: { color: 'bg-blue-100 text-blue-800', icon: Send, label: 'Submitted' },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
  returned: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Returned' },
};

export const MyGoals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sharedGoals, setSharedGoals] = useState<SharedGoalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);

      const shared = await fetchSharedGoalsForEmployee(user!.id);
      setSharedGoals(shared);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = (goal: Goal) => {
    if (goal.is_locked) return false;
    return goal.status === 'draft' || goal.status === 'returned';
  };

  const handleEdit = (goalId: string) => {
    navigate(`/employee/goals/edit/${goalId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/employee')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Goals</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {sharedGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Shared Goals (read-only)
            </h2>
            <div className="space-y-4">
              {sharedGoals.map((sg) => (
                <div key={sg.assignmentId} className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Shared Goal
                    </span>
                    <span className="text-xs text-gray-500">From: {sg.sourceOwnerName}</span>
                    <span className="text-xs text-gray-500">Your weightage: {sg.weightage}%</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">{sg.goal.title}</h3>
                  {sg.goal.description && (
                    <p className="mt-1 text-sm text-gray-600">{sg.goal.description}</p>
                  )}
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    This is a shared goal. Achievements sync from the source owner — you cannot edit it here.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Thrust Area</p>
                      <p className="text-sm text-gray-900">{sg.goal.thrust_area}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Target</p>
                      <p className="text-sm text-gray-900">
                        {sg.goal.uom_type === 'timeline'
                          ? sg.goal.target_date
                          : sg.goal.uom_type === 'zero'
                          ? '0'
                          : sg.goal.target_value}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Status</p>
                      <p className="text-sm text-gray-900 capitalize">{sg.goal.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 && sharedGoals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No goals yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first goal for the current cycle.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/employee/goals/create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const StatusBadge = STATUS_BADGES[goal.status];
              const StatusIcon = StatusBadge.icon;

              return (
                <div key={goal.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${StatusBadge.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {StatusBadge.label}
                        </span>
                        {goal.is_locked && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </span>
                        )}
                        {goal.is_shared && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Shared
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                      {goal.description && (
                        <p className="mt-1 text-sm text-gray-600">{goal.description}</p>
                      )}
                    </div>
                    {canEdit(goal) && (
                      <button
                        onClick={() => handleEdit(goal.id)}
                        className="ml-4 p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Thrust Area</p>
                      <p className="text-sm text-gray-900">{goal.thrust_area}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Unit of Measurement</p>
                      <p className="text-sm text-gray-900 capitalize">{goal.uom_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Target</p>
                      <p className="text-sm text-gray-900">
                        {goal.uom_type === 'timeline' 
                          ? goal.target_date 
                          : goal.uom_type === 'zero'
                          ? '0'
                          : goal.target_value}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Weightage</p>
                      <p className="text-sm text-gray-900">{goal.weightage}%</p>
                    </div>
                  </div>

                  {goal.manager_comment && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-medium text-red-800 mb-1">Manager Comment:</p>
                      <p className="text-sm text-red-700">{goal.manager_comment}</p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total Weightage: <span className="font-semibold">{goals.reduce((sum, g) => sum + g.weightage, 0)}%</span>
              </div>
              <button
                onClick={() => navigate('/employee/goals/create')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add New Goal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
