import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { toast } from '../utils/toast';
import type { CsvColumn } from '../utils/csvExport';
import { PageHeaderSkeleton, FiltersSkeleton, TableSkeleton } from '../components/PageSkeletons';
import { exportToCSV, formatDateForCSV, formatNumberForCSV } from '../utils/csvExport';
import { formatScore } from '../utils/scoreCalculator';

interface AchievementReportRow {
  employee_name: string;
  employee_email: string;
  manager_name: string | null;
  goal_title: string;
  thrust_area: string;
  uom_type: string;
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  q1_actual: number | string | null;
  q1_status: string | null;
  q1_score: number | null;
  q2_actual: number | string | null;
  q2_status: string | null;
  q2_score: number | null;
  q3_actual: number | string | null;
  q3_status: string | null;
  q3_score: number | null;
  q4_actual: number | string | null;
  q4_status: string | null;
  q4_score: number | null;
}

export const AchievementReport: React.FC = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<AchievementReportRow[]>([]);
  const [filteredData, setFilteredData] = useState<AchievementReportRow[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [thrustAreas, setThrustAreas] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    employee: '',
    thrustArea: '',
    quarter: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, reportData]);

  const fetchReportData = async () => {
    try {
      type GoalRow = {
        id: string;
        employee_id: string;
        title: string;
        thrust_area: string;
        uom_type: string;
        target_value: number | null;
        target_date: string | null;
        weightage: number;
      };

      type AchievementRow = {
        goal_id: string;
        quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
        actual_value: number | null;
        actual_date: string | null;
        progress_status: string | null;
        score: number | null;
      };

      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select(
          'id, employee_id, title, thrust_area, uom_type, target_value, target_date, weightage'
        )
        .eq('status', 'approved');

      if (goalsError) throw goalsError;

      const typedGoals = (goals || []) as GoalRow[];
      const goalIds = typedGoals.map((g) => g.id);
      const employeeIds = Array.from(new Set(typedGoals.map((g) => g.employee_id)));

      const { data: achievements, error: achievementsError } = goalIds.length
        ? await supabase
            .from('achievements')
            .select('goal_id, quarter, actual_value, actual_date, progress_status, score')
            .in('goal_id', goalIds)
        : { data: [], error: null };

      if (achievementsError) throw achievementsError;

      const { data: employeeProfiles, error: employeesError } = employeeIds.length
        ? await supabase.from('profiles').select('id, name, email, manager_id').in('id', employeeIds)
        : { data: [], error: null };

      if (employeesError) throw employeesError;

      const managerIds = Array.from(
        new Set((employeeProfiles || []).map((p) => p.manager_id).filter(Boolean))
      ) as string[];

      const { data: managersData, error: managersError } = managerIds.length
        ? await supabase.from('profiles').select('id, name').in('id', managerIds)
        : { data: [], error: null };

      if (managersError) throw managersError;

      const employeeById = new Map<string, { id: string; name: string; email: string; manager_id: string | null }>(
        (employeeProfiles || []).map((p) => [p.id, p])
      );
      const managerNameById = new Map<string, string>((managersData || []).map((m) => [m.id, m.name]));

      const achievementByGoalQuarter = new Map<string, AchievementRow>();
      for (const a of (achievements || []) as AchievementRow[]) {
        achievementByGoalQuarter.set(`${a.goal_id}:${a.quarter}`, a);
      }

      // Build report data
      const reportRows: AchievementReportRow[] = [];
      const uniqueEmployees = new Map<string, { id: string; name: string }>();
      const uniqueThrustAreas = new Set<string>();

      for (const goal of typedGoals) {
        const q1 = achievementByGoalQuarter.get(`${goal.id}:Q1`);
        const q2 = achievementByGoalQuarter.get(`${goal.id}:Q2`);
        const q3 = achievementByGoalQuarter.get(`${goal.id}:Q3`);
        const q4 = achievementByGoalQuarter.get(`${goal.id}:Q4`);

        const getActualValue = (achievement?: AchievementRow) => {
          if (!achievement) return null;
          return achievement.actual_date || achievement.actual_value;
        };

        const employee = employeeById.get(goal.employee_id);
        const managerName = employee?.manager_id ? managerNameById.get(employee.manager_id) ?? null : null;

        reportRows.push({
          employee_name: employee?.name || '',
          employee_email: employee?.email || '',
          manager_name: managerName,
          goal_title: goal.title,
          thrust_area: goal.thrust_area,
          uom_type: goal.uom_type,
          target_value: goal.target_value,
          target_date: goal.target_date,
          weightage: goal.weightage,
          q1_actual: getActualValue(q1),
          q1_status: q1?.progress_status || null,
          q1_score: q1?.score || null,
          q2_actual: getActualValue(q2),
          q2_status: q2?.progress_status || null,
          q2_score: q2?.score || null,
          q3_actual: getActualValue(q3),
          q3_status: q3?.progress_status || null,
          q3_score: q3?.score || null,
          q4_actual: getActualValue(q4),
          q4_status: q4?.progress_status || null,
          q4_score: q4?.score || null,
        });

        if (employee) uniqueEmployees.set(employee.id, { id: employee.id, name: employee.name });
        uniqueThrustAreas.add(goal.thrust_area);
      }

      setReportData(reportRows);
      setFilteredData(reportRows);
      setEmployees(
        Array.from(uniqueEmployees.values()).sort((a, b) => a.name.localeCompare(b.name))
      );
      setThrustAreas(Array.from(uniqueThrustAreas).sort());
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = reportData;

    if (filters.employee) {
      filtered = filtered.filter((row) => row.employee_name === filters.employee);
    }

    if (filters.thrustArea) {
      filtered = filtered.filter((row) => row.thrust_area === filters.thrustArea);
    }

    setFilteredData(filtered);
  };

  const handleExportCSV = () => {
    const columns: CsvColumn[] = [
      { key: 'employee_name', header: 'Employee Name' },
      { key: 'employee_email', header: 'Employee Email' },
      { key: 'manager_name', header: 'Manager Name' },
      { key: 'goal_title', header: 'Goal Title' },
      { key: 'thrust_area', header: 'Thrust Area' },
      { key: 'uom_type', header: 'UoM Type' },
      {
        key: 'target_value',
        header: 'Target Value',
        format: (v) => (v !== null ? String(v) : ''),
      },
      {
        key: 'target_date',
        header: 'Target Date',
        format: (v) => formatDateForCSV(v),
      },
      { key: 'weightage', header: 'Weightage (%)' },
      { key: 'q1_actual', header: 'Q1 Actual' },
      { key: 'q1_status', header: 'Q1 Status' },
      {
        key: 'q1_score',
        header: 'Q1 Score',
        format: (v) => (v !== null ? formatNumberForCSV(v, 1) : ''),
      },
      { key: 'q2_actual', header: 'Q2 Actual' },
      { key: 'q2_status', header: 'Q2 Status' },
      {
        key: 'q2_score',
        header: 'Q2 Score',
        format: (v) => (v !== null ? formatNumberForCSV(v, 1) : ''),
      },
      { key: 'q3_actual', header: 'Q3 Actual' },
      { key: 'q3_status', header: 'Q3 Status' },
      {
        key: 'q3_score',
        header: 'Q3 Score',
        format: (v) => (v !== null ? formatNumberForCSV(v, 1) : ''),
      },
      { key: 'q4_actual', header: 'Q4 Actual' },
      { key: 'q4_status', header: 'Q4 Status' },
      {
        key: 'q4_score',
        header: 'Q4 Score',
        format: (v) => (v !== null ? formatNumberForCSV(v, 1) : ''),
      },
    ];

    exportToCSV(filteredData, columns, 'achievement_report');
    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeaderSkeleton withAction />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FiltersSkeleton fields={3} columns={3} />
          <TableSkeleton columns={8} rows={8} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Achievement Report</h1>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredData.length === 0}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={filters.employee}
                onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area</label>
              <select
                value={filters.thrustArea}
                onChange={(e) => setFilters({ ...filters, thrustArea: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Thrust Areas</option>
                {thrustAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ employee: '', thrustArea: '', quarter: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Report Table */}
        {filteredData.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
              <p className="mt-1 text-sm text-gray-500">
                {reportData.length === 0
                  ? 'No approved goals with achievements found.'
                  : 'No data matches your filter criteria.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Goal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thrust Area
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight
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
                  {filteredData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                        <div className="text-sm font-medium text-gray-900">{row.employee_name}</div>
                        <div className="text-xs text-gray-500">{row.manager_name || 'No Manager'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{row.goal_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.thrust_area}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {row.target_date || row.target_value || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.weightage}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.q1_actual || '-'}</div>
                        <div className="text-xs text-gray-500">{formatScore(row.q1_score)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.q2_actual || '-'}</div>
                        <div className="text-xs text-gray-500">{formatScore(row.q2_score)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.q3_actual || '-'}</div>
                        <div className="text-xs text-gray-500">{formatScore(row.q3_score)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{row.q4_actual || '-'}</div>
                        <div className="text-xs text-gray-500">{formatScore(row.q4_score)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredData.length} of {reportData.length} records
        </div>
      </main>
    </div>
  );
};
