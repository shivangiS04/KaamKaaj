# Hackathon Demo Scripts — Critical Fixes

Run `supabase/hackathon_critical_fixes.sql` in Supabase SQL Editor before demos.

## 1. Score Calculation Fix

### Before (bug)
- `numeric_min` used `(target / actual) * 100` — inverted
- `numeric_max` used `(actual / target) * 100` — inverted

### After (correct)
| Goal type | Example | Formula | Score |
|-----------|---------|---------|-------|
| Revenue (`numeric_min`) | Target 100K, Actual 120K | `(120/100)*100` capped | **100%** |
| Response time (`numeric_max`) | Target 5h, Actual 3h | `(5/3)*100` capped | **100%** |

### Demo steps
1. Log in as `employee1@demo.com`
2. Open **Quarterly Achievement Input**
3. For a revenue goal (numeric_min): enter actual **120** with target **100** → score shows **100%**
4. For a response-time goal (numeric_max): enter actual **3** with target **5** → score shows **100%**

### Verify via SQL
```sql
SELECT public.recalculate_numeric_achievement_scores();
```

## 2. Shared Goals Workflow

### Demo steps
1. Log in as `manager1@demo.com`
2. Go to **Share Approved Goals** (`/manager/shared-goals`)
3. Pick an approved team goal → **Share Goal**
4. Select **3 employees** with weightages (e.g. 25%, 30%, 20%)
5. Log in as `employee2@demo.com` → **My Goals** → see **Shared Goals** section (read-only)
6. Log in as source owner → **Achievement Input** → save Q1 data
7. Log in as assigned employee → achievements synced automatically (DB trigger)

## 3. Check-in Window Enforcement

### Allowed (inside window)
- Active cycle `window_open_date` ≤ today ≤ `window_close_date`
- Employee can save achievements in the UI

### Blocked (API bypass)
```javascript
// In browser console while logged in as employee (outside window or via SQL test):
const { data, error } = await supabase.from('achievements').insert({
  goal_id: '<approved-goal-uuid>',
  quarter: 'Q1',
  actual_value: 99,
  progress_status: 'on_track',
});
console.log(error?.message); // "Check-in window is closed" or "has not opened yet"
```

### Admin bypass
- Admins skip the trigger (for corrections during demos)

### Demo cycle for “closed window”
```sql
UPDATE goal_cycles SET is_active = false WHERE is_active = true;
INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (2026, 'Closed Demo Cycle', '2020-01-01', '2020-12-31', true);
```

Restore open window after demo using `supabase/create_cycle.sql`.
