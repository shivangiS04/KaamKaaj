import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Users, Target, Settings, BarChart3, FileText, Unlock, Download, Share2 } from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from '../utils/toast';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeGoals: 0,
    activeCycle: 'None',
    lockedGoals: 0,
  });
  const [managerEffectiveness, setManagerEffectiveness] = useState<
    {
      managerId: string;
      managerName: string;
      teamSize: number;
      goalsApproved: number;
      checkinsDone: number;
      avgTeamScore: number | null;
    }[]
  >([]);
  const [escalationEmployeesNoSubmission, setEscalationEmployeesNoSubmission] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [escalationManagersPendingApprovals, setEscalationManagersPendingApprovals] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [escalationEmployeesMissingQ1, setEscalationEmployeesMissingQ1] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = Date.now();
      const cutoffISO = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

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
        .select('id, phase_name')
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

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, manager_id');

      if (profilesError) throw profilesError;

      const profiles = (profilesData || []) as {
        id: string;
        name: string;
        email: string;
        role: 'employee' | 'manager' | 'admin';
        manager_id: string | null;
      }[];

      const managers = profiles.filter((p) => p.role === 'manager');
      const employees = profiles.filter((p) => p.role === 'employee');
      const employeesByManager = new Map<string, { id: string; name: string; email: string }[]>();
      employees.forEach((e) => {
        if (!e.manager_id) return;
        employeesByManager.set(e.manager_id, [...(employeesByManager.get(e.manager_id) || []), e]);
      });

      const allEmployeeIds = employees.map((e) => e.id);
      if (allEmployeeIds.length === 0) {
        setManagerEffectiveness(
          managers.map((m) => ({
            managerId: m.id,
            managerName: m.name,
            teamSize: employeesByManager.get(m.id)?.length || 0,
            goalsApproved: 0,
            checkinsDone: 0,
            avgTeamScore: null,
          }))
        );
        setEscalationEmployeesNoSubmission([]);
        setEscalationManagersPendingApprovals([]);
        setEscalationEmployeesMissingQ1([]);
        return;
      }

      let goalsForCycleQuery = supabase
        .from('goals')
        .select('id, employee_id, status, updated_at')
        .in('employee_id', allEmployeeIds);

      if (cycle?.id) goalsForCycleQuery = goalsForCycleQuery.eq('goal_cycle_id', cycle.id);

      const { data: goalsForCycle, error: goalsForCycleError } = await goalsForCycleQuery;
      if (goalsForCycleError) throw goalsForCycleError;

      const goalsRows = (goalsForCycle || []) as {
        id: string;
        employee_id: string;
        status: 'draft' | 'submitted' | 'approved' | 'returned';
        updated_at: string;
      }[];

      const goalIds = goalsRows.map((g) => g.id);

      const managerStats = new Map<
        string,
        {
          managerId: string;
          managerName: string;
          teamSize: number;
          goalsApproved: number;
          checkinsDone: number;
          scoreSum: number;
          scoreCount: number;
        }
      >();

      managers.forEach((m) => {
        const teamSize = employeesByManager.get(m.id)?.length || 0;
        managerStats.set(m.id, {
          managerId: m.id,
          managerName: m.name,
          teamSize,
          goalsApproved: 0,
          checkinsDone: 0,
          scoreSum: 0,
          scoreCount: 0,
        });
      });

      const employeeManagerIdByEmployeeId = new Map<string, string>();
      employees.forEach((e) => {
        if (!e.manager_id) return;
        employeeManagerIdByEmployeeId.set(e.id, e.manager_id);
      });

      goalsRows.forEach((g) => {
        const managerId = employeeManagerIdByEmployeeId.get(g.employee_id);
        if (!managerId) return;
        const stat = managerStats.get(managerId);
        if (!stat) return;
        if (g.status === 'approved') stat.goalsApproved += 1;
      });

      if (goalIds.length > 0) {
        const { data: q1Achievements, error: q1AchievementsError } = await supabase
          .from('achievements')
          .select('goal_id, score, actual_value, actual_date')
          .eq('quarter', 'Q1')
          .in('goal_id', goalIds)
          .or('actual_value.not.is.null,actual_date.not.is.null');

        if (q1AchievementsError) throw q1AchievementsError;

        const goalEmployeeIdByGoalId = new Map<string, string>();
        goalsRows.forEach((g) => goalEmployeeIdByGoalId.set(g.id, g.employee_id));

        (q1Achievements || []).forEach((a) => {
          const employeeId = goalEmployeeIdByGoalId.get(a.goal_id);
          if (!employeeId) return;
          const managerId = employeeManagerIdByEmployeeId.get(employeeId);
          if (!managerId) return;
          const stat = managerStats.get(managerId);
          if (!stat) return;
          stat.checkinsDone += 1;
          if (a.score !== null && a.score !== undefined) {
            stat.scoreSum += Number(a.score);
            stat.scoreCount += 1;
          }
        });
      }

      setManagerEffectiveness(
        Array.from(managerStats.values())
          .map((m) => ({
            managerId: m.managerId,
            managerName: m.managerName,
            teamSize: m.teamSize,
            goalsApproved: m.goalsApproved,
            checkinsDone: m.checkinsDone,
            avgTeamScore: m.scoreCount > 0 ? m.scoreSum / m.scoreCount : null,
          }))
          .sort((a, b) => b.teamSize - a.teamSize)
      );

      const employeesWithSubmittedOrApproved = new Set(
        goalsRows
          .filter((g) => g.status === 'submitted' || g.status === 'approved')
          .map((g) => g.employee_id)
      );
      setEscalationEmployeesNoSubmission(
        employees.filter((e) => !employeesWithSubmittedOrApproved.has(e.id)).map((e) => ({
          id: e.id,
          name: e.name,
          email: e.email,
        }))
      );

      const pendingApprovalManagers = new Set<string>();
      goalsRows.forEach((g) => {
        if (g.status !== 'submitted') return;
        if (!g.updated_at || g.updated_at >= cutoffISO) return;
        const managerId = employeeManagerIdByEmployeeId.get(g.employee_id);
        if (!managerId) return;
        pendingApprovalManagers.add(managerId);
      });
      setEscalationManagersPendingApprovals(
        managers
          .filter((m) => pendingApprovalManagers.has(m.id))
          .map((m) => ({ id: m.id, name: m.name, email: m.email }))
      );

      const approvedGoals = goalsRows.filter((g) => g.status === 'approved');
      const approvedGoalIds = approvedGoals.map((g) => g.id);
      const employeesWithApprovedGoals = new Set(approvedGoals.map((g) => g.employee_id));
      const employeeApprovedGoalIds = new Map<string, string[]>();
      approvedGoals.forEach((g) => {
        employeeApprovedGoalIds.set(g.employee_id, [...(employeeApprovedGoalIds.get(g.employee_id) || []), g.id]);
      });

      const q1AchievementGoalIds = new Set<string>();
      if (approvedGoalIds.length > 0) {
        const { data: q1All, error: q1AllError } = await supabase
          .from('achievements')
          .select('goal_id')
          .eq('quarter', 'Q1')
          .in('goal_id', approvedGoalIds);

        if (q1AllError) throw q1AllError;
        (q1All || []).forEach((a) => q1AchievementGoalIds.add(a.goal_id));
      }

      setEscalationEmployeesMissingQ1(
        employees
          .filter((e) => employeesWithApprovedGoals.has(e.id))
          .filter((e) => {
            const ids = employeeApprovedGoalIds.get(e.id) || [];
            return ids.every((goalId) => !q1AchievementGoalIds.has(goalId));
          })
          .map((e) => ({ id: e.id, name: e.name, email: e.email }))
      );
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white shadow dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">Welcome, {profile?.name}</span>
              <ThemeToggle />
              <NotificationBell />
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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

          <button
            onClick={() => navigate('/admin/shared-goals')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <Share2 className="h-8 w-8 text-indigo-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Share Approved Goals</h3>
            <p className="mt-2 text-sm text-gray-500">Push goals to employees with custom weightages</p>
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

        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Manager Effectiveness Overview</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : managerEffectiveness.length === 0 ? (
              <div className="text-sm text-gray-500">No managers found.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goals Approved</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-ins Done</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Team Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {managerEffectiveness.map((row) => (
                    <tr key={row.managerId}>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.managerName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.teamSize}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.goalsApproved}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.checkinsDone}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {row.avgTeamScore === null ? '-' : `${row.avgTeamScore.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Escalation Alerts</h2>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Employees who haven't submitted goals yet</h3>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : escalationEmployeesNoSubmission.length === 0 ? (
                <div className="text-sm text-gray-500">No alerts.</div>
              ) : (
                <div className="space-y-3">
                  {escalationEmployeesNoSubmission.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 border border-gray-200 rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate">{p.email}</div>
                      </div>
                      <button
                        onClick={() => toast.success(`Reminder sent to ${p.email}`)}
                        className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        Send Reminder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Managers with pending approvals &gt; 2 days old</h3>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : escalationManagersPendingApprovals.length === 0 ? (
                <div className="text-sm text-gray-500">No alerts.</div>
              ) : (
                <div className="space-y-3">
                  {escalationManagersPendingApprovals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 border border-gray-200 rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate">{p.email}</div>
                      </div>
                      <button
                        onClick={() => toast.success(`Reminder sent to ${p.email}`)}
                        className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        Send Reminder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Employees with missing Q1 check-in</h3>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : escalationEmployeesMissingQ1.length === 0 ? (
                <div className="text-sm text-gray-500">No alerts.</div>
              ) : (
                <div className="space-y-3">
                  {escalationEmployeesMissingQ1.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 border border-gray-200 rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate">{p.email}</div>
                      </div>
                      <button
                        onClick={() => toast.success(`Reminder sent to ${p.email}`)}
                        className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        Send Reminder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
