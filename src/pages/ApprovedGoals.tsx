import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Share2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { ShareGoalModal } from '../components/ShareGoalModal';
import { toast } from '../utils/toast';

interface Goal {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  thrust_area: string;
  uom_type: string;
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  is_shared: boolean;
  profiles?: { name: string; email: string };
}

interface Assignment {
  id: string;
  assigned_to: string;
  weightage: number;
  profiles?: { name: string; email: string };
}

interface ApprovedGoalsProps {
  backPath: string;
  isAdmin: boolean;
}

export const ApprovedGoals: React.FC<ApprovedGoalsProps> = ({ backPath, isAdmin }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [assignmentsByGoal, setAssignmentsByGoal] = useState<Record<string, Assignment[]>>({});
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [shareGoal, setShareGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedGoals();
  }, []);

  const fetchApprovedGoals = async () => {
    try {
      let goalsQuery = supabase
        .from('goals')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        const { data: team } = await supabase
          .from('profiles')
          .select('id')
          .eq('manager_id', user!.id);

        const teamIds = team?.map((t) => t.id) || [];
        if (teamIds.length === 0) {
          setGoals([]);
          setLoading(false);
          return;
        }
        goalsQuery = goalsQuery.in('employee_id', teamIds);
      }

      const { data: goalsData, error } = await goalsQuery;
      if (error) throw error;

      const ownerIds = [...new Set((goalsData || []).map((g) => g.employee_id))];
      const { data: owners } = await supabase.from('profiles').select('id, name, email').in('id', ownerIds);
      const ownerMap = new Map((owners || []).map((o) => [o.id, o]));

      const goalsWithOwners: Goal[] = (goalsData || []).map((g) => ({
        ...g,
        profiles: ownerMap.get(g.employee_id),
      }));
      setGoals(goalsWithOwners);

      if (goalsData && goalsData.length > 0) {
        const goalIds = goalsData.map((g) => g.id);
        const { data: assignments, error: assignError } = await supabase
          .from('shared_goal_assignments')
          .select('id, source_goal_id, assigned_to, weightage')
          .in('source_goal_id', goalIds);

        if (assignError) throw assignError;

        const assigneeIds = [...new Set((assignments || []).map((a) => a.assigned_to))];
        const { data: assignees } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', assigneeIds);
        const assigneeMap = new Map((assignees || []).map((p) => [p.id, p]));

        const byGoal: Record<string, Assignment[]> = {};
        assignments?.forEach((a) => {
          if (!byGoal[a.source_goal_id]) byGoal[a.source_goal_id] = [];
          byGoal[a.source_goal_id].push({
            id: a.id,
            assigned_to: a.assigned_to,
            weightage: a.weightage,
            profiles: assigneeMap.get(a.assigned_to),
          });
        });
        setAssignmentsByGoal(byGoal);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load goals';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignments = (goalId: string) => {
    setExpandedGoal((prev) => (prev === goalId ? null : goalId));
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button type="button" onClick={() => navigate(backPath)} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Approved Goals — Share</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {goals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No approved goals available to share.
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const ownerName = goal.profiles?.name || 'Unknown';
              const assignments = assignmentsByGoal[goal.id] || [];
              const isExpanded = expandedGoal === goal.id;

              return (
                <div key={goal.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Owner: {ownerName}</p>
                      <h3 className="text-lg font-medium text-gray-900">{goal.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {goal.thrust_area} · {goal.weightage}% weightage
                        {goal.is_shared && (
                          <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                            Shared
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShareGoal(goal)}
                      className="flex items-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shrink-0"
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share Goal
                    </button>
                  </div>

                  {assignments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => toggleAssignments(goal.id)}
                        className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 ml-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </button>
                      {isExpanded && (
                        <ul className="mt-2 space-y-1">
                          {assignments.map((a) => (
                            <li key={a.id} className="text-sm text-gray-600 flex justify-between">
                              <span>{a.profiles?.name || a.assigned_to}</span>
                              <span className="font-medium">{a.weightage}%</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {shareGoal && (
        <ShareGoalModal
          goalId={shareGoal.id}
          goalTitle={shareGoal.title}
          goalOwnerId={shareGoal.employee_id}
          managerId={profile?.id}
          isAdmin={isAdmin}
          onClose={() => setShareGoal(null)}
          onSuccess={fetchApprovedGoals}
        />
      )}
    </div>
  );
};
