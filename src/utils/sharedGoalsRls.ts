/** RLS rule: employees may only see assignments where assigned_to matches their id */
export function canViewSharedAssignment(assignmentAssignedTo: string, viewerId: string): boolean {
  return assignmentAssignedTo === viewerId;
}
