import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Edit2, Save, X, CheckCircle } from 'lucide-react';
import { toast } from '../utils/toast';
import { PageHeaderSkeleton, TableSkeleton } from '../components/PageSkeletons';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeToggle } from '../components/ThemeToggle';

interface GoalCycle {
  id: string;
  year: number;
  phase_name: string;
  window_open_date: string;
  window_close_date: string;
  is_active: boolean;
  checkin_windows?: { Q1: boolean; Q2: boolean; Q3: boolean; Q4: boolean } | null;
  created_at: string;
}

export const CycleManagement: React.FC = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<GoalCycle[]>([]);
  const [editingCycle, setEditingCycle] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<GoalCycle>>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCycle, setNewCycle] = useState({
    year: new Date().getFullYear(),
    phase_name: '',
    window_open_date: '',
    window_close_date: '',
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const defaultCheckinWindows = { Q1: false, Q2: false, Q3: false, Q4: false };

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_cycles')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async () => {
    if (!newCycle.phase_name || !newCycle.window_open_date || !newCycle.window_close_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(newCycle.window_open_date) >= new Date(newCycle.window_close_date)) {
      toast.error('Window open date must be before close date');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.from('goal_cycles').insert({
        year: newCycle.year,
        phase_name: newCycle.phase_name,
        window_open_date: newCycle.window_open_date,
        window_close_date: newCycle.window_close_date,
        is_active: false,
      });

      if (error) throw error;

      toast.success('Goal cycle created successfully');
      setShowCreateModal(false);
      setNewCycle({
        year: new Date().getFullYear(),
        phase_name: '',
        window_open_date: '',
        window_close_date: '',
      });
      fetchCycles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create cycle');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditCycle = (cycleId: string, cycle: GoalCycle) => {
    setEditingCycle(cycleId);
    setEditedValues({
      [cycleId]: {
        year: cycle.year,
        phase_name: cycle.phase_name,
        window_open_date: cycle.window_open_date,
        window_close_date: cycle.window_close_date,
      },
    });
  };

  const handleSaveEdit = async (cycleId: string) => {
    setProcessing(true);
    try {
      const values = editedValues[cycleId];

      if (
        new Date(values.window_open_date!) >= new Date(values.window_close_date!)
      ) {
        toast.error('Window open date must be before close date');
        setProcessing(false);
        return;
      }

      const { error } = await supabase
        .from('goal_cycles')
        .update({
          year: values.year,
          phase_name: values.phase_name,
          window_open_date: values.window_open_date,
          window_close_date: values.window_close_date,
        })
        .eq('id', cycleId);

      if (error) throw error;

      toast.success('Cycle updated successfully');
      setEditingCycle(null);
      fetchCycles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update cycle');
    } finally {
      setProcessing(false);
    }
  };

  const handleActivateCycle = async (cycleId: string) => {
    setProcessing(true);
    try {
      // Deactivate all cycles first
      await supabase.from('goal_cycles').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

      // Activate selected cycle
      const { error } = await supabase
        .from('goal_cycles')
        .update({ is_active: true })
        .eq('id', cycleId);

      if (error) throw error;

      toast.success('Cycle activated successfully');
      fetchCycles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate cycle');
    } finally {
      setProcessing(false);
    }
  };

  const updateCheckinWindow = async (cycleId: string, quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', nextValue: boolean) => {
    setProcessing(true);
    try {
      const current = cycles.find((c) => c.id === cycleId);
      const currentWindows = current?.checkin_windows ?? defaultCheckinWindows;
      const updated = { ...defaultCheckinWindows, ...currentWindows, [quarter]: nextValue };

      const { error } = await supabase
        .from('goal_cycles')
        .update({ checkin_windows: updated })
        .eq('id', cycleId);

      if (error) throw error;

      setCycles(cycles.map((c) => (c.id === cycleId ? { ...c, checkin_windows: updated } : c)));
      toast.success(`${quarter} check-in window ${nextValue ? 'opened' : 'closed'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update check-in window');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeaderSkeleton withAction />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TableSkeleton columns={6} rows={8} />
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goal Cycle Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Cycle
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(() => {
          const activeCycle = cycles.find((c) => c.is_active);
          if (!activeCycle) return null;
          const windows = activeCycle.checkin_windows ?? defaultCheckinWindows;

          const ToggleRow = ({
            quarter,
          }: {
            quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
          }) => {
            const isOpen = Boolean(windows[quarter]);
            return (
              <div className="flex items-center justify-between gap-4 border border-gray-200 rounded-md px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{quarter} Check-in Window — {isOpen ? 'Open' : 'Closed'}</div>
                </div>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => updateCheckinWindow(activeCycle.id, quarter, !isOpen)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors disabled:opacity-50 ${
                    isOpen ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${isOpen ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          };

          return (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-gray-900">Active Cycle</h2>
                  <div className="mt-1 text-sm text-gray-600">
                    {activeCycle.year} • {activeCycle.phase_name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(activeCycle.window_open_date).toLocaleDateString()} — {new Date(activeCycle.window_close_date).toLocaleDateString()}
                  </div>
                </div>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Active
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Check-in Windows</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ToggleRow quarter="Q1" />
                  <ToggleRow quarter="Q2" />
                  <ToggleRow quarter="Q3" />
                  <ToggleRow quarter="Q4" />
                </div>
              </div>
            </div>
          );
        })()}

        {cycles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No goal cycles yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first goal cycle.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Cycle
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Window Open
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Window Close
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
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className={cycle.is_active ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCycle === cycle.id ? (
                        <input
                          type="number"
                          value={editedValues[cycle.id]?.year || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [cycle.id]: {
                                ...editedValues[cycle.id],
                                year: parseInt(e.target.value),
                              },
                            })
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{cycle.year}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCycle === cycle.id ? (
                        <input
                          type="text"
                          value={editedValues[cycle.id]?.phase_name || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [cycle.id]: {
                                ...editedValues[cycle.id],
                                phase_name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">{cycle.phase_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCycle === cycle.id ? (
                        <input
                          type="date"
                          value={editedValues[cycle.id]?.window_open_date || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [cycle.id]: {
                                ...editedValues[cycle.id],
                                window_open_date: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">
                          {new Date(cycle.window_open_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCycle === cycle.id ? (
                        <input
                          type="date"
                          value={editedValues[cycle.id]?.window_close_date || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [cycle.id]: {
                                ...editedValues[cycle.id],
                                window_close_date: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <div className="text-sm text-gray-900">
                          {new Date(cycle.window_close_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cycle.is_active ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingCycle === cycle.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingCycle(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(cycle.id)}
                            disabled={processing}
                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditCycle(cycle.id, cycle)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          {!cycle.is_active && (
                            <button
                              onClick={() => handleActivateCycle(cycle.id)}
                              disabled={processing}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Goal Cycle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="number"
                  value={newCycle.year}
                  onChange={(e) => setNewCycle({ ...newCycle, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phase Name *
                </label>
                <input
                  type="text"
                  value={newCycle.phase_name}
                  onChange={(e) => setNewCycle({ ...newCycle, phase_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., FY2024 Goal Setting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Window Open Date *
                </label>
                <input
                  type="date"
                  value={newCycle.window_open_date}
                  onChange={(e) =>
                    setNewCycle({ ...newCycle, window_open_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Window Close Date *
                </label>
                <input
                  type="date"
                  value={newCycle.window_close_date}
                  onChange={(e) =>
                    setNewCycle({ ...newCycle, window_close_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCycle({
                    year: new Date().getFullYear(),
                    phase_name: '',
                    window_open_date: '',
                    window_close_date: '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCycle}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
