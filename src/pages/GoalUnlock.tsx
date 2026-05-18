import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Unlock, Search } from 'lucide-react';
import { toast } from '../utils/toast';
import { PageHeaderSkeleton, FiltersSkeleton, TableSkeleton } from '../components/PageSkeletons';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeToggle } from '../components/ThemeToggle';

interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  status: string;
  is_locked: boolean;
  employee: {
    name: string;
    email: string;
  };
}

export const GoalUnlock: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchLockedGoals();
  }, []);

  useEffect(() => {
    filterGoals();
  }, [searchTerm, statusFilter, goals]);

  const fetchLockedGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select(`
          id,
          title,
          thrust_area,
          status,
          is_locked,
          employee:profiles!goals_employee_id_fkey (
            name,
            email
          )
        `)
        .eq('is_locked', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Fix: Handle employee data which could be an array or object
      const formattedData = (data || []).map((goal: any) => ({
        ...goal,
        employee: Array.isArray(goal.employee) ? goal.employee[0] : goal.employee
      }));
      
      setGoals(formattedData);
      setFilteredGoals(formattedData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch locked goals');
    } finally {
      setLoading(false);
    }
  };

  const filterGoals = () => {
    let filtered = goals;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (goal) =>
          goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          goal.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          goal.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((goal) => goal.status === statusFilter);
    }

    setFilteredGoals(filtered);
  };

  const handleUnlockGoal = async (goalId: string, goalTitle: string) => {
    if (!confirm(`Are you sure you want to unlock the goal "${goalTitle}"? This will allow the employee to edit it.`)) {
      return;
    }

    setProcessing(true);
    try {
      const goal = goals.find((g) => g.id === goalId);
      // Unlock the goal
      const { data: unlockData, error: unlockError } = await supabase
        .from('goals')
        .update({ is_locked: false })
        .eq('id', goalId)
        .select('id, is_locked')
        .single();

      if (unlockError) throw unlockError;
      console.log('Unlock goal update response:', unlockData);

      // Log the unlock action
      const { error: logError } = await supabase.from('audit_logs').insert({
        table_name: 'goals',
        record_id: goalId,
        action: 'UPDATE',
        changed_by: user!.id,
        old_data: { status: goal?.status ?? null, is_locked: true },
        new_data: { status: goal?.status ?? null, is_locked: false },
        changed_at: new Date().toISOString(),
      });

      if (logError) toast.error(logError.message || 'Failed to write audit log');

      toast.success('Goal unlocked successfully');
      fetchLockedGoals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock goal');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeaderSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FiltersSkeleton fields={2} columns={2} />
          <TableSkeleton columns={4} rows={8} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white shadow dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goal Unlock</h1>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee name, email, or goal title..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="submitted">Submitted</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <Unlock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {goals.length === 0 ? 'No locked goals' : 'No goals match your filters'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {goals.length === 0
                  ? 'All goals are currently unlocked.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Goal Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thrust Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGoals.map((goal) => (
                  <tr key={goal.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{goal.employee.name}</div>
                      <div className="text-sm text-gray-500">{goal.employee.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{goal.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{goal.thrust_area}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          goal.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : goal.status === 'submitted'
                            ? 'bg-blue-100 text-blue-800'
                            : goal.status === 'returned'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {goal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleUnlockGoal(goal.id, goal.title)}
                        disabled={processing}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Unlock className="h-4 w-4 mr-1" />
                        Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredGoals.length} of {goals.length} locked goals
        </div>
      </main>
    </div>
  );
};
