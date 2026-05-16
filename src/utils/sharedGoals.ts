import { supabase } from '../lib/supabase';
import type { UomType } from './scoreCalculator';

export interface SharedGoalView {
  assignmentId: string;
  weightage: number;
  sourceOwnerName: string;
  goal: {
    id: string;
    title: string;
    description: string | null;
    thrust_area: string;
    uom_type: UomType;
    target_value: number | null;
    target_date: string | null;
    status: string;
  };
}

export async function fetchSharedGoalsForEmployee(employeeId: string): Promise<SharedGoalView[]> {
  const { data: assignments, error } = await supabase
    .from('shared_goal_assignments')
    .select('id, weightage, source_goal_id')
    .eq('assigned_to', employeeId);

  if (error) throw error;
  if (!assignments?.length) return [];

  const goalIds = assignments.map((a) => a.source_goal_id);
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, title, description, thrust_area, uom_type, target_value, target_date, status, employee_id')
    .in('id', goalIds);

  if (goalsError) throw goalsError;

  const ownerIds = [...new Set((goals || []).map((g) => g.employee_id))];
  const { data: owners, error: ownersError } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', ownerIds);

  if (ownersError) throw ownersError;

  const ownerMap = new Map((owners || []).map((o) => [o.id, o.name]));
  const goalMap = new Map((goals || []).map((g) => [g.id, g]));

  return assignments
    .map((a) => {
      const goal = goalMap.get(a.source_goal_id);
      if (!goal) return null;
      return {
        assignmentId: a.id,
        weightage: a.weightage,
        sourceOwnerName: ownerMap.get(goal.employee_id) || 'Unknown',
        goal: {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          thrust_area: goal.thrust_area,
          uom_type: goal.uom_type as UomType,
          target_value: goal.target_value,
          target_date: goal.target_date,
          status: goal.status,
        },
      };
    })
    .filter((x): x is SharedGoalView => x !== null);
}

export { canViewSharedAssignment } from './sharedGoalsRls';
