import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  uom_type: 'numeric_min' | 'numeric_max' | 'timeline' | 'zero';
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  status: 'draft' | 'submitted' | 'approved' | 'returned';
}

interface Achievement {
  id?: string;
  goal_id: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  actual_value: number | null;
  actual_date: string | null;
  progress_status: 'not_started' | 'on_track' | 'completed';
  score: number | null;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const PROGRESS_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'on_track', label: 'On Track' },
  { value: 'completed', label: 'Completed' },
];

export const AchievementInput: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkInWindow, setCheckInWindow] = useState<{ open: boolean; message: string }>({
    open: true,
    message: '',
  });

  useEffect(() => {
    fetchGoalsAndAchievements();
    checkCheckInWindow();
  }, [selectedQuarter]);

  const checkCheckInWindow = async () => {
    try {
      const { data: cycle } = await supabase
        .from('goal_cycles')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!cycle) {
        setCheckInWindow({ open: false, message: 'No active goal cycle found' });
        return;
      }

      const now = new Date();
      const windowOpen = new Date(cycle.window_open_date);
      const windowClose = new Date(cycle.window_close_date);

      if (now < windowOpen || now > windowClose) {
        setCheckInWindow({
          open: false,
          message: `Check-in window is closed. Next window opens on ${windowOpen.toLocaleDateString()}`,
        });
      } else {
        setCheckInWindow({ open: true, message: '' });
      }
    } catch (err) {
      console.error('Error checking check-in window:', err);
    }
  };

  const fetchGoalsAndAchievements = async () => {
    try {
      // Fetch approved goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('status', 'approved');

      if (goalsError) throw goalsError;
      setGoals(goalsData || []);

      // Fetch existing achievements for selected quarter
      if (goalsData && goalsData.length > 0) {
        const goalIds = goalsData.map((g) => g.id);
        const { data: achievementsData, error: achievementsError } = await supabase
          .from('achievements')
          .select('*')
          .in('goal_id', goalIds)
          .eq('quarter', selectedQuarter);

        if (achievementsError) throw achievementsError;

        const achievementsMap: Record<string, Achievement> = {};
        achievementsData?.forEach((a) => {
          achievementsMap[a.goal_id] = a;
        });
        setAchievements(achievementsMap);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const computeScore = (goal: Goal, achievement: Achievement): number | null => {
    if (goal.uom_type === 'numeric_max') {
      if (!achievement.actual_value || !goal.target_value) return null;
      const score = (achievement.actual_value / goal.target_value) * 100;
      return Math.min(score, 100);
    } else if (goal.uom_type === 'numeric_min') {
      if (!achievement.actual_value || !goal.target_value) return null;
      const score = (goal.target_value / achievement.actual_value) * 100;
      return Math.min(score, 100);
    } else if (goal.uom_type === 'timeline') {
      if (!achievement.actual_date || !goal.target_date) return null;
      const actual = new Date(achievement.actual_date);
      const target = new Date(goal.target_date);
      return actual <= target ? 100 : 0;
    } else if (goal.uom_type === 'zero') {
      if (achievement.actual_value === null) return null;
      return achievement.actual_value === 0 ? 100 : 0;
    }
    return null;
  };

  const updateAchievement = (goalId: string, field: keyof Achievement, value: any) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const currentAchievement = achievements[goalId] || {
      goal_id: goalId,
      quarter: selectedQuarter,
      actual_value: null,
      actual_date: null,
      progress_status: 'not_started',
      score: null,
    };

    const updatedAchievement = { ...currentAchievement, [field]: value };
    const score = computeScore(goal, updatedAchievement);
    updatedAchievement.score = score;

    setAchievements({ ...achievements, [goalId]: updatedAchievement });
  };

  const saveAchievements = async () => {
    setSaving(true);
    setError('');

    try {
      const achievementsToUpsert = Object.values(achievements).map((a) => ({
        goal_id: a.goal_id,
        quarter: a.quarter,
        actual_value: a.actual_value,
        actual_date: a.actual_date,
        progress_status: a.progress_status,
        score: a.score,
      }));

      for (const achievement of achievementsToUpsert) {
        const { error } = await supabase
          .from('achievements')
          .upsert(achievement, {
            onConflict: 'goal_id,shared_goal_assignment_id,quarter',
          });

        if (error) throw error;
      }

      navigate('/employee');
    } catch (err: any) {
      setError(err.message || 'Failed to save achievements');
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Quarterly Achievement Input</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!checkInWindow.open && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {checkInWindow.message}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Quarter Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Quarter</label>
          <div className="flex space-x-2">
            {QUARTERS.map((quarter) => (
              <button
                key={quarter}
                onClick={() => setSelectedQuarter(quarter)}
                className={`px-4 py-2 rounded-md font-medium ${
                  selectedQuarter === quarter
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {quarter}
              </button>
            ))}
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No approved goals</h3>
              <p className="mt-1 text-sm text-gray-500">
                You need approved goals to input achievements.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const achievement = achievements[goal.id] || {
                goal_id: goal.id,
                quarter: selectedQuarter,
                actual_value: null,
                actual_date: null,
                progress_status: 'not_started',
                score: null,
              };

              return (
                <div key={goal.id} className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                    <p className="text-sm text-gray-600">{goal.thrust_area} • Weightage: {goal.weightage}%</p>
                    <p className="text-sm text-gray-600">
                      Target: {goal.uom_type === 'timeline' ? goal.target_date : goal.uom_type === 'zero' ? '0' : goal.target_value}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {goal.uom_type === 'timeline' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Date
                        </label>
                        <input
                          type="date"
                          value={achievement.actual_date || ''}
                          onChange={(e) => updateAchievement(goal.id, 'actual_date', e.target.value)}
                          disabled={!checkInWindow.open}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    ) : goal.uom_type !== 'zero' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Value
                        </label>
                        <input
                          type="number"
                          value={achievement.actual_value || ''}
                          onChange={(e) => updateAchievement(goal.id, 'actual_value', parseFloat(e.target.value) || null)}
                          disabled={!checkInWindow.open}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Value (should be 0)
                        </label>
                        <input
                          type="number"
                          value={achievement.actual_value || ''}
                          onChange={(e) => updateAchievement(goal.id, 'actual_value', parseFloat(e.target.value) || null)}
                          disabled={!checkInWindow.open}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Progress Status
                      </label>
                      <select
                        value={achievement.progress_status}
                        onChange={(e) => updateAchievement(goal.id, 'progress_status', e.target.value)}
                        disabled={!checkInWindow.open}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {PROGRESS_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Computed Score
                      </label>
                      <div className="flex items-center px-3 py-2 bg-gray-50 rounded-md">
                        {achievement.score !== null ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-lg font-semibold text-gray-900">{achievement.score.toFixed(1)}%</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end">
              <button
                onClick={saveAchievements}
                disabled={saving || !checkInWindow.open}
                className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? 'Saving...' : 'Save Achievements'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
