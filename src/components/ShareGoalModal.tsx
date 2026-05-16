import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Share2 } from 'lucide-react';
import { toast } from '../utils/toast';

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface ExistingAssignment {
  assigned_to: string;
  weightage: number;
}

interface ShareGoalModalProps {
  goalId: string;
  goalTitle: string;
  goalOwnerId: string;
  managerId?: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShareGoalModal: React.FC<ShareGoalModalProps> = ({
  goalId,
  goalTitle,
  goalOwnerId,
  managerId,
  isAdmin,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existing, setExisting] = useState<ExistingAssignment[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [goalId]);

  const loadData = async () => {
    try {
      let employeeQuery = supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'employee')
        .neq('id', goalOwnerId)
        .order('name');

      if (!isAdmin && managerId) {
        employeeQuery = employeeQuery.eq('manager_id', managerId);
      }

      const [{ data: employeeData, error: empError }, { data: assignData, error: assignError }] =
        await Promise.all([
          employeeQuery,
          supabase
            .from('shared_goal_assignments')
            .select('assigned_to, weightage')
            .eq('source_goal_id', goalId),
        ]);

      if (empError) throw empError;
      if (assignError) throw assignError;

      setEmployees(employeeData || []);
      setExisting(assignData || []);

      const initial: Record<string, number> = {};
      assignData?.forEach((a) => {
        initial[a.assigned_to] = a.weightage;
      });
      setSelected(initial);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load employees';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) {
        delete next[id];
      } else {
        next[id] = 25;
      }
      return next;
    });
  };

  const setWeightage = (id: string, weightage: number) => {
    setSelected((prev) => ({ ...prev, [id]: weightage }));
  };

  const validate = (): string | null => {
    const entries = Object.entries(selected);
    if (entries.length === 0) return 'Select at least one employee';
    for (const [, w] of entries) {
      if (w < 10 || w > 100) return 'Each weightage must be between 10% and 100%';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const selectedIds = new Set(Object.keys(selected));
      const toRemove = existing.filter((a) => !selectedIds.has(a.assigned_to));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('shared_goal_assignments')
          .delete()
          .eq('source_goal_id', goalId)
          .in(
            'assigned_to',
            toRemove.map((r) => r.assigned_to)
          );
        if (error) throw error;
      }

      const rows = Object.entries(selected).map(([assigned_to, weightage]) => ({
        source_goal_id: goalId,
        assigned_to,
        weightage,
      }));

      const { error: upsertError } = await supabase
        .from('shared_goal_assignments')
        .upsert(rows, { onConflict: 'source_goal_id,assigned_to' });

      if (upsertError) throw upsertError;

      const { error: goalError } = await supabase
        .from('goals')
        .update({ is_shared: true })
        .eq('id', goalId);

      if (goalError) throw goalError;

      toast.success('Goal shared successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to share goal';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-medium text-gray-900">Share Goal</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-6 text-sm text-gray-600 -mt-2 pb-2">{goalTitle}</p>
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading employees...</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No eligible employees found.</p>
          ) : (
            <ul className="space-y-3">
              {employees.map((emp) => {
                const isSelected = selected[emp.id] !== undefined;
                return (
                  <li
                    key={emp.id}
                    className={`border rounded-lg p-3 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmployee(emp.id)}
                        className="mt-1 h-4 w-4 text-indigo-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                        {isSelected && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-gray-600">Weightage:</span>
                            <input
                              type="number"
                              min={10}
                              max={100}
                              value={selected[emp.id]}
                              onChange={(e) => setWeightage(emp.id, parseInt(e.target.value, 10) || 10)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                            <span className="text-xs text-gray-600">%</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex items-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4 mr-1" />
            {submitting ? 'Sharing...' : 'Share Goal'}
          </button>
        </div>
      </div>
    </div>
  );
};

