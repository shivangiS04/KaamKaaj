import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../utils/toast';
import { PageHeaderSkeleton, FiltersSkeleton, TableSkeleton } from '../components/PageSkeletons';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string;
  changed_by_name: string;
  old_data: any;
  new_data: any;
  changed_at: string;
}

export const AuditLogViewer: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    table: '',
    action: '',
    user: '',
    dateFrom: '',
    dateTo: '',
  });
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  useEffect(() => {
    fetchAuditLogs();
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, logs]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          changed_by_profile:profiles!audit_logs_changed_by_fkey (name)
        `)
        .order('changed_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const logsWithNames = (data || []).map((log) => ({
        ...log,
        changed_by_name: log.changed_by_profile?.name || 'Unknown',
      }));

      setLogs(logsWithNames);
      setFilteredLogs(logsWithNames);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const applyFilters = () => {
    let filtered = logs;

    if (filters.table) {
      filtered = filtered.filter((log) => log.table_name === filters.table);
    }

    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }

    if (filters.user) {
      filtered = filtered.filter((log) => log.changed_by === filters.user);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(
        (log) => new Date(log.changed_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.changed_at) <= dateTo);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const renderDataDiff = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;

    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    return (
      <div className="mt-2 space-y-2">
        {Array.from(allKeys).map((key) => {
          const oldValue = oldData?.[key];
          const newValue = newData?.[key];
          const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

          if (!hasChanged) return null;

          return (
            <div key={key} className="text-xs">
              <span className="font-medium text-gray-700">{key}:</span>
              <div className="ml-4 space-y-1">
                {oldValue !== undefined && (
                  <div className="text-red-600">
                    <span className="font-medium">Old:</span> {JSON.stringify(oldValue)}
                  </div>
                )}
                {newValue !== undefined && (
                  <div className="text-green-600">
                    <span className="font-medium">New:</span> {JSON.stringify(newValue)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeaderSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FiltersSkeleton fields={5} columns={5} />
          <TableSkeleton columns={5} rows={10} />
        </main>
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
              onClick={() => navigate('/admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log Viewer</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
              <select
                value={filters.table}
                onChange={(e) => setFilters({ ...filters, table: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">All Tables</option>
                <option value="goals">Goals</option>
                <option value="achievements">Achievements</option>
                <option value="profiles">Profiles</option>
                <option value="goal_cycles">Goal Cycles</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">All Actions</option>
                <option value="INSERT">Insert</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="UNLOCK">Unlock</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <select
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() =>
                setFilters({ table: '', action: '', user: '', dateFrom: '', dateTo: '' })
              }
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Logs List */}
        {currentLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {logs.length === 0
                  ? 'No audit logs have been recorded yet.'
                  : 'No logs match your filter criteria.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200">
                {currentLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50">
                    <div
                      className="flex justify-between items-start cursor-pointer"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              log.action === 'INSERT'
                                ? 'bg-green-100 text-green-800'
                                : log.action === 'UPDATE'
                                ? 'bg-blue-100 text-blue-800'
                                : log.action === 'DELETE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {log.table_name}
                          </span>
                          <span className="text-sm text-gray-500">by {log.changed_by_name}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(log.changed_at).toLocaleString()}
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        {expandedLog === log.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {expandedLog === log.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>Record ID:</strong> {log.record_id}
                        </div>
                        {renderDataDiff(log.old_data, log.new_data)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)}{' '}
                  of {filteredLogs.length} logs
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
