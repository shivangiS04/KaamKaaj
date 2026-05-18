import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageSquare, User } from 'lucide-react';
import { toast } from '../utils/toast';
import { formatScore, getScoreBadgeClass } from '../utils/scoreCalculator';
import { PageHeaderSkeleton, ListRowsSkeleton } from '../components/PageSkeletons';

interface Employee {
  id: string;
  name: string;
  email: string;
}

interface Goal {
  id: string;
  title: string;
  thrust_area: string;
  uom_type: string;
  target_value: number | null;
  target_date: string | null;
  weightage: number;
}

interface Achievement {
  id: string;
  goal_id: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  actual_value: number | null;
  actual_date: string | null;
  progress_status: 'not_started' | 'on_track' | 'completed';
  score: number | null;
  goal: Goal;
}

interface Comment {
  id: string;
  achievement_id: string;
  manager_id: string;
  comment: string;
  created_at: string;
  manager: {
    name: string;
  };
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

export const ManagerCheckin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchAchievements();
    }
  }, [selectedEmployee, selectedQuarter]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('manager_id', user!.id);

      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    if (!selectedEmployee) return;

    try {
      // First, get approved goals for the employee
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('employee_id', selectedEmployee)
        .eq('status', 'approved');

      if (goalsError) throw goalsError;

      const goalIds = (goalsData || []).map((g) => g.id);

      if (goalIds.length === 0) {
        setAchievements([]);
        return;
      }

      // Fetch achievements with goals
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select(`
          *,
          goal:goals (
            id,
            title,
            thrust_area,
            uom_type,
            target_value,
            target_date,
            weightage
          )
        `)
        .eq('quarter', selectedQuarter)
        .in('goal_id', goalIds)
        .order('updated_at', { ascending: false });

      if (achievementsError) throw achievementsError;

      // Fix: Handle goal data which could be an array or object
      const formattedAchievements = (achievementsData || []).map((achievement: any) => ({
        ...achievement,
        goal: Array.isArray(achievement.goal) ? achievement.goal[0] : achievement.goal
      }));

      const seen = new Set<string>();
      const uniqueAchievements = formattedAchievements.filter((a: any) => {
        if (seen.has(a.goal_id)) return false;
        seen.add(a.goal_id);
        return true;
      });

      // Fetch comments for these achievements
      if (uniqueAchievements.length > 0) {
        const achievementIds = uniqueAchievements.map((a: any) => a.id);
        const { data: commentsData, error: commentsError } = await supabase
          .from('checkin_comments')
          .select(`
            *,
            manager:profiles!checkin_comments_manager_id_fkey (name)
          `)
          .in('achievement_id', achievementIds)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        // Group comments by achievement_id
        const commentsMap: Record<string, Comment[]> = {};
        (commentsData || []).forEach((comment: any) => {
          if (!commentsMap[comment.achievement_id]) {
            commentsMap[comment.achievement_id] = [];
          }
          // Fix: Handle manager data which could be an array or object
          const managerData = Array.isArray(comment.manager) ? comment.manager[0] : comment.manager;
          commentsMap[comment.achievement_id].push({
            ...comment,
            manager: managerData
          });
        });
        setComments(commentsMap);
      }

      setAchievements(uniqueAchievements);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch achievements');
    }
  };

  const handleAddComment = async (achievementId: string) => {
    const comment = newComment[achievementId]?.trim();
    if (!comment) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('checkin_comments').insert({
        achievement_id: achievementId,
        manager_id: user!.id,
        comment,
      });

      if (error) throw error;

      toast.success('Comment added successfully');
      setNewComment({ ...newComment, [achievementId]: '' });
      fetchAchievements();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeaderSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ListRowsSkeleton rows={6} />
        </main>
      </div>
    );
  }

  const selectedEmployeeData = employees.find((e) => e.id === selectedEmployee);

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
            <h1 className="text-2xl font-bold text-gray-900">Quarterly Check-in</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                Team members will appear here once they are assigned to you.
              </p>
            </div>
          </div>
        ) : !selectedEmployee ? (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Select Team Member</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEmployee(employee.id)}
                >
                  <h3 className="text-lg font-medium text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-600">{employee.email}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Employee and Quarter Selector */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEmployeeData?.name}</h2>
                  <p className="text-sm text-gray-600">{selectedEmployeeData?.email}</p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Change Employee
                </button>
              </div>

              <div>
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
            </div>

            {/* Achievements List */}
            {achievements.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No achievements yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Employee hasn't input achievements for {selectedQuarter} yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="bg-white rounded-lg shadow p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{achievement.goal.title}</h3>
                      <p className="text-sm text-gray-600">
                        {achievement.goal.thrust_area} • Weightage: {achievement.goal.weightage}%
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Target</p>
                        <p className="text-sm text-gray-900">
                          {achievement.goal.uom_type === 'timeline'
                            ? achievement.goal.target_date
                            : achievement.goal.uom_type === 'zero'
                            ? '0'
                            : achievement.goal.target_value}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Actual</p>
                        <p className="text-sm text-gray-900">
                          {achievement.actual_date
                            ? achievement.actual_date
                            : achievement.actual_value !== null && achievement.actual_value !== undefined
                            ? achievement.actual_value
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Progress</p>
                        <p className="text-sm text-gray-900 capitalize">
                          {achievement.progress_status.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Score</p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadgeClass(
                            achievement.score
                          )}`}
                        >
                          {formatScore(achievement.score)}
                        </span>
                      </div>
                    </div>

                    {/* Comments Section */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Check-in Comments</h4>

                      {/* Existing Comments */}
                      {comments[achievement.id] && comments[achievement.id].length > 0 && (
                        <div className="space-y-2 mb-4">
                          {comments[achievement.id].map((comment) => (
                            <div key={comment.id} className="bg-gray-50 rounded p-3">
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-xs font-medium text-gray-700">{comment.manager.name}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-sm text-gray-900">{comment.comment}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Comment */}
                      <div className="flex space-x-2">
                        <textarea
                          value={newComment[achievement.id] || ''}
                          onChange={(e) =>
                            setNewComment({ ...newComment, [achievement.id]: e.target.value })
                          }
                          rows={2}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="Add a check-in comment..."
                        />
                        <button
                          onClick={() => handleAddComment(achievement.id)}
                          disabled={submitting || !newComment[achievement.id]?.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
