-- Part 4/4: Shared goal weightage + delete policy
ALTER TABLE shared_goal_assignments
    DROP CONSTRAINT IF EXISTS shared_goal_assignments_weightage_check;

ALTER TABLE shared_goal_assignments
    ADD CONSTRAINT shared_goal_assignments_weightage_check
    CHECK (weightage >= 10 AND weightage <= 100);

DROP POLICY IF EXISTS "Managers and Admins can delete shared goals" ON shared_goal_assignments;
CREATE POLICY "Managers and Admins can delete shared goals" ON shared_goal_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );
