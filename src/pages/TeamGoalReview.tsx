import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, User, CheckCircle, XCircle, Edit2, Save } from 'lucide-react';
import { toast } from '../utils/toast';

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Goal {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  thrust_area: string;
  uom_type: 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  status: 'draft' | 'submitted' | 'approved' | 'returned';
  is_locked: boolean;
}

interface EmployeeGoals {
  employee: Employee;
  goals: Goal[];
  totalWeightage: number;
}

export const TeamGoalReview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employeeGoals, setEmployeeGoals] = useState<EmployeeGoals[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [returnComment, setReturnComment] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [goalToReturn, setGoalToReturn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTeamGoals();
  }, []);

  const fetchTeamGoals = async () => {
    try {
      // Fetch team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('manager_id', user!.id);

      if (teamError) throw teamError;

      if (!teamMembers || teamMembers.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch goals for each team member
      const employeeGoalsData: EmployeeGoals[] = [];

      for (const member of teamMembers) {
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('employee_id', member.id)
          .eq('status', 'submitted')
          .order('created_at', { ascending: true });

        if (goalsError) throw goalsError;

        if (goals && goals.length > 0) {
          const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
          employeeGoalsData.push({
            employee: member,
            goals,
            totalWeightage,
          });
        }
      }

      setEmployeeGoals(employeeGoalsData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch team goals');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGoal = (goalId: string, goal: Goal) => {
    setEditingGoal(goalId);
    setEditedValues({
      [goalId]: {
        target_value: goal.target_value,
        weightage: goal.weightage,
      },
    });
  };

  const handleSaveEdit = async (goalId: string) => {
    try {
      const values = editedValues[goalId];
      const { error } = await supabase
        .from('goals')
        .update({
          target_value: values.target_value,
          weightage: values.weightage,
        })
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Goal updated successfully');
      setEditingGoal(null);
      fetchTeamGoals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update goal');
    }
  };

  const handleApproveGoal = async (goalId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          status: 'approved',
          is_locked: true,
        })
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Goal approved successfully');
      fetchTeamGoals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve goal');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAllForEmployee = async (employeeId: string) => {
    const employeeData = employeeGoals.find((eg) => eg.employee.id === employeeId);
    if (!employeeData) return;

    if (employeeData.totalWeightage !== 100) {
      toast.error('Cannot approve: Total weightage must equal 100%');
      return;
    }

    setProcessing(true);
    try {
      const goalIds = employeeData.goals.map((g) => g.id);
      const { error } = await supabase
        .from('goals')
        .update({
          status: 'approved',
          is_locked: true,
        })
        .in('id', goalIds);

      if (error) throw error;

      toast.success(`All goals approved for ${employeeData.employee.name}`);
      fetchTeamGoals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve goals');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturnGoal = async () => {
    if (!goalToReturn || !returnComment.trim()) {
      toast.error('Please provide a comment explaining why the goal is being returned');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          status: 'returned',
          manager_comment: returnComment,
        })
        .eq('id', goalToReturn);

      if (error) throw error;

      toast.success('Goal returned to employee');
      setShowReturnModal(false);
      setReturnComment('');
      setGoalToReturn(null);
      fetchTeamGoals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to return goal');
    } finally {
      setProcessing(false);
    }
  };

  const openReturnModal = (goalId: string) => {
    setGoalToReturn(goalId);
    setShowReturnModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const selectedEmployeeData = employeeGoals.find((eg) => eg.employee.id === selectedEmployee);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/manager')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Team Goal Review</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {employeeGoals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending reviews</h3>
              <p className="mt-1 text-sm text-gray-500">
                Team members will appear here when they submit their goals for review.
              </p>
            </div>
          </div>
        ) : !selectedEmployee ? (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Team Members with Pending Goals</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {employeeGoals.map((eg) => (
                <div
                  key={eg.employee.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEmployee(eg.employee.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{eg.employee.name}</h3>
                      <p className="text-sm text-gray-600">{eg.employee.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{eg.goals.length} Goals</p>
                      <p
                        className={`text-sm ${
                          eg.totalWeightage === 100 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        Total: {eg.totalWeightage}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedEmployeeData ? (
          <div>
            {/* Employee Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEmployeeData.employee.name}</h2>
                  <p className="text-sm text-gray-600">{selectedEmployeeData.employee.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Weightage</p>
                  <p
                    className={`text-2xl font-bold ${
                      selectedEmployeeData.totalWeightage === 100 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {selectedEmployeeData.totalWeightage}%
                  </p>
                </div>
              </div>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Back to List
                </button>
                <button
                  onClick={() => handleApproveAllForEmployee(selectedEmployeeData.employee.id)}
                  disabled={processing || selectedEmployeeData.totalWeightage !== 100}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve All Goals
                </button>
              </div>
            </div>

            {/* Goals List */}
            <div className="space-y-4">
              {selectedEmployeeData.goals.map((goal) => (
                <div key={goal.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                      {goal.description && (
                        <p className="mt-1 text-sm text-gray-600">{goal.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Thrust Area</p>
                      <p className="text-sm text-gray-900">{goal.thrust_area}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">UoM Type</p>
                      <p className="text-sm text-gray-900 capitalize">
                        {goal.uom_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Target</p>
                      {editingGoal === goal.id ? (
                        <input
                          type="number"
                          value={editedValues[goal.id]?.target_value || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [goal.id]: {
                                ...editedValues[goal.id],
                                target_value: parseFloat(e.target.value) || null,
                              },
                            })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">
                          {goal.uom_type === 'timeline'
                            ? goal.target_date
                            : goal.uom_type === 'zero'
                            ? '0'
                            : goal.target_value}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Weightage</p>
                      {editingGoal === goal.id ? (
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={editedValues[goal.id]?.weightage || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [goal.id]: {
                                ...editedValues[goal.id],
                                weightage: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{goal.weightage}%</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    {editingGoal === goal.id ? (
                      <>
                        <button
                          onClick={() => setEditingGoal(null)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(goal.id)}
                          className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditGoal(goal.id, goal)}
                          className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => openReturnModal(goal.id)}
                          disabled={processing}
                          className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Return
                        </button>
                        <button
                          onClick={() => handleApproveGoal(goal.id)}
                          disabled={processing}
                          className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Return Goal to Employee</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a comment explaining why this goal is being returned:
            </p>
            <textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your comment..."
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnComment('');
                  setGoalToReturn(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnGoal}
                disabled={processing || !returnComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Returning...' : 'Return Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
