import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from '../utils/toast';
import { PageHeaderSkeleton, StatCardsSkeleton, TableSkeleton } from '../components/PageSkeletons';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeToggle } from '../components/ThemeToggle';

interface EmployeeCompletion {
  id: string;
  name: string;
  email: string;
  manager_name: string | null;
  goals_status: 'not_started' | 'in_progress' | 'completed';
  q1_status: 'not_started' | 'in_progress' | 'completed';
  q2_status: 'not_started' | 'in_progress' | 'completed';
  q3_status: 'not_started' | 'in_progress' | 'completed';
  q4_status: 'not_started' | 'in_progress' | 'completed';
}

interface Stats {
  totalEmployees: number;
  goalsCompleted: number;
  goalsInProgress: number;
  goalsNotStarted: number;
}

const StatusBadge: React.FC<{ status: 'not_started' | 'in_progress' | 'completed' }> = ({
  status,
}) => {
  const config = {
    completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Complete' },
    in_progress: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
    not_started: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Not Started' },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </span>
  );
};

export const CompletionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeCompletion[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    goalsCompleted: 0,
    goalsInProgress: 0,
    goalsNotStarted: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletionData();
  }, []);

  const fetchCompletionData = async () => {
    try {
      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select('id, name, email, manager_id')
        .eq('role', 'employee');

      if (employeesError) throw employeesError;

      const typedEmployees = (employeesData || []) as {
        id: string;
        name: string;
        email: string;
        manager_id: string | null;
      }[];

      const managerIds = Array.from(
        new Set(typedEmployees.map((e) => e.manager_id).filter(Boolean))
      ) as string[];

      const { data: managersData, error: managersError } = managerIds.length
        ? await supabase.from('profiles').select('id, name').in('id', managerIds)
        : { data: [], error: null };

      if (managersError) throw managersError;

      const managerNameById = new Map<string, string>(
        ((managersData || []) as { id: string; name: string }[]).map((m) => [m.id, m.name])
      );

      // For each employee, check their goal and achievement status
      const completionData: EmployeeCompletion[] = [];

      for (const employee of typedEmployees) {
        // Check goals status
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('id, status')
          .eq('employee_id', employee.id);

        if (goalsError) throw goalsError;

        let goalsStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (goals && goals.length > 0) {
          const hasApproved = goals.some((g) => g.status === 'approved');
          const hasSubmitted = goals.some((g) => g.status === 'submitted');
          goalsStatus = hasApproved ? 'completed' : hasSubmitted ? 'in_progress' : 'in_progress';
        }

        // Check quarterly achievements
        const checkQuarterStatus = async (quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
          const approvedGoalIds = (goals || []).filter((g) => g.status === 'approved').map((g) => g.id);
          const approvedGoalsCount = approvedGoalIds.length;
          if (approvedGoalsCount === 0) return 'not_started';

          const { data: achievements, error: achievementsError } = await supabase
            .from('achievements')
            .select('id')
            .eq('quarter', quarter)
            .in('goal_id', approvedGoalIds);

          if (achievementsError) throw achievementsError;

          if (!achievements || achievements.length === 0) return 'not_started';
          if (achievements.length < approvedGoalsCount) return 'in_progress';
          return 'completed';
        };

        const q1Status = await checkQuarterStatus('Q1');
        const q2Status = await checkQuarterStatus('Q2');
        const q3Status = await checkQuarterStatus('Q3');
        const q4Status = await checkQuarterStatus('Q4');

        const managerName = employee.manager_id
          ? managerNameById.get(employee.manager_id) ?? null
          : null;

        completionData.push({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          manager_name: managerName,
          goals_status: goalsStatus,
          q1_status: q1Status,
          q2_status: q2Status,
          q3_status: q3Status,
          q4_status: q4Status,
        });
      }

      setEmployees(completionData);

      // Calculate stats
      const totalEmployees = completionData.length;
      const goalsCompleted = completionData.filter((e) => e.goals_status === 'completed').length;
      const goalsInProgress = completionData.filter((e) => e.goals_status === 'in_progress').length;
      const goalsNotStarted = completionData.filter((e) => e.goals_status === 'not_started').length;

      setStats({
        totalEmployees,
        goalsCompleted,
        goalsInProgress,
        goalsNotStarted,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch completion data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeaderSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StatCardsSkeleton count={4} />
          <TableSkeleton columns={6} rows={10} />
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Completion Dashboard</h1>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Employees</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Goals Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.goalsCompleted}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalEmployees > 0
                ? Math.round((stats.goalsCompleted / stats.totalEmployees) * 100)
                : 0}
              % completion
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">In Progress</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.goalsInProgress}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Not Started</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.goalsNotStarted}</p>
          </div>
        </div>

        {/* Completion Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Employee Completion Status</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Goals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Q1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Q2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Q3
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Q4
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.manager_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={employee.goals_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={employee.q1_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={employee.q2_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={employee.q3_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={employee.q4_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
