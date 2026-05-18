import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { LogOut, Target, CheckSquare, Plus } from "lucide-react";
import { toast } from "../utils/toast";
import { calculateScore } from "../utils/scoreCalculator";
import { NotificationBell } from "../components/NotificationBell";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AREA_COLORS = [
  "#4f46e5",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#7c3aed",
  "#0f766e",
];
const TREND_LINE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

type PlannedVsActualDatum = { goal: string; planned: number; actual: number };
type PlannedVsActualTooltipItem = {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
  payload?: PlannedVsActualDatum;
};

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [goalsCount, setGoalsCount] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [statusLabel, setStatusLabel] = useState("No Goals");
  const [previewGoals, setPreviewGoals] = useState<
    { id: string; title: string; status: string }[]
  >([]);
  const [plannedVsActual, setPlannedVsActual] = useState<
    PlannedVsActualDatum[]
  >([]);
  const [goalsByThrustArea, setGoalsByThrustArea] = useState<
    { name: string; value: number }[]
  >([]);
  const [trendData, setTrendData] = useState<
    Array<Record<string, number | string | null>>
  >([]);
  const [trendGoals, setTrendGoals] = useState<
    Array<{ id: string; title: string; color: string }>
  >([]);

  const toNumber = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  };

  useEffect(() => {
    if (!profile) return;

    const fetchStats = async () => {
      try {
        const { data: activeCycle, error: activeCycleError } = await supabase
          .from("goal_cycles")
          .select("id")
          .eq("is_active", true)
          .maybeSingle();

        if (activeCycleError) throw activeCycleError;

        let goalsQuery = supabase
          .from("goals")
          .select(
            "id, title, status, updated_at, thrust_area, uom_type, target_value, target_date",
          )
          .eq("employee_id", profile.id)
          .order("updated_at", { ascending: false });

        if (activeCycle?.id)
          goalsQuery = goalsQuery.eq("goal_cycle_id", activeCycle.id);

        const { data: goals, error: goalsError } = await goalsQuery;

        if (goalsError) throw goalsError;

        const totalGoals = (goals || []).length;
        setGoalsCount(totalGoals);
        setPreviewGoals(
          (goals || [])
            .slice(0, 3)
            .map((g) => ({ id: g.id, title: g.title, status: g.status })),
        );

        if (totalGoals === 0) {
          setStatusLabel("No Goals");
          setAchievementsCount(0);
          setPreviewGoals([]);
          setPlannedVsActual([]);
          setGoalsByThrustArea([]);
          setTrendData([]);
          setTrendGoals([]);
          return;
        }

        const allApproved = (goals || []).every((g) => g.status === "approved");
        const mostRecentStatus = goals?.[0]?.status ?? "draft";
        const nextStatus = allApproved ? "approved" : mostRecentStatus;
        setStatusLabel(
          `${nextStatus.charAt(0).toUpperCase()}${nextStatus.slice(1)}`,
        );

        const goalIds = (goals || []).map((g) => g.id);
        const { data: achievements, error: achievementsError } = await supabase
          .from("achievements")
          .select("goal_id")
          .in("goal_id", goalIds)
          .or("actual_value.not.is.null,actual_date.not.is.null");

        if (achievementsError) throw achievementsError;

        const uniqueGoalIds = new Set(
          (achievements || []).map((a) => a.goal_id),
        );
        setAchievementsCount(uniqueGoalIds.size);

        const approvedGoals = (goals || []).filter(
          (g) => g.status === "approved",
        );
        const goalAreaCounts = new Map<string, number>();
        approvedGoals.forEach((g) => {
          goalAreaCounts.set(
            g.thrust_area,
            (goalAreaCounts.get(g.thrust_area) || 0) + 1,
          );
        });
        setGoalsByThrustArea(
          Array.from(goalAreaCounts.entries()).map(([name, value]) => ({
            name,
            value,
          })),
        );

        const numericGoals = approvedGoals.filter(
          (g) => g.uom_type !== "timeline",
        );
        const numericGoalIds = numericGoals.map((g) => g.id);
        if (numericGoalIds.length === 0) {
          setPlannedVsActual([]);
        } else {
          const { data: q1Achievements, error: q1Error } = await supabase
            .from("achievements")
            .select("goal_id, actual_value, updated_at")
            .eq("quarter", "Q1")
            .in("goal_id", numericGoalIds)
            .order("updated_at", { ascending: false });

          if (q1Error) throw q1Error;

          const actualByGoalId = new Map<string, number>();
          (q1Achievements || []).forEach((a) => {
            if (actualByGoalId.has(a.goal_id)) return;
            actualByGoalId.set(a.goal_id, toNumber(a.actual_value));
          });

          setPlannedVsActual(
            numericGoals
              .map((g) => ({
                goal: g.title,
                planned: g.uom_type === "zero" ? 0 : toNumber(g.target_value),
                actual: actualByGoalId.get(g.id) ?? 0,
              }))
              .sort((a, b) => b.planned - a.planned),
          );
        }

        const approvedGoalIds = approvedGoals.map((g) => g.id);
        if (approvedGoalIds.length === 0) {
          setTrendData([]);
          setTrendGoals([]);
        } else {
          const { data: trendAchievements, error: trendError } = await supabase
            .from("achievements")
            .select("goal_id, quarter, score, actual_value, actual_date")
            .in("goal_id", approvedGoalIds);

          if (trendError) throw trendError;

          console.log(
            "[TrendChart] approved goal IDs being queried:",
            approvedGoalIds,
          );
          console.log(
            "[TrendChart] raw achievements from DB:",
            trendAchievements,
          );

          // Build a lookup: goalId → goal metadata (needed to recompute score)
          const goalById = new Map(approvedGoals.map((g) => [g.id, g]));

          const quarters: Array<"Q1" | "Q2" | "Q3" | "Q4"> = [
            "Q1",
            "Q2",
            "Q3",
            "Q4",
          ];
          const base = quarters.map((q) => {
            const row: Record<string, number | string | null> = { quarter: q };
            approvedGoalIds.forEach((goalId) => {
              row[goalId] = null; // null = no data yet; line will stop here
            });
            return row;
          });

          (trendAchievements || []).forEach((a) => {
            const idx = quarters.indexOf(a.quarter);
            if (idx === -1) return;

            let resolvedScore: number | null = null;

            if (a.score !== null && a.score !== undefined) {
              // Prefer the stored score when available
              resolvedScore = Math.max(0, Math.min(100, toNumber(a.score)));
            } else {
              // Score not stored yet — try recomputing from raw actual values
              const goal = goalById.get(a.goal_id);
              if (goal) {
                const computed = calculateScore({
                  uomType: goal.uom_type,
                  targetValue: goal.target_value,
                  actualValue: a.actual_value ?? null,
                  targetDate: goal.target_date ?? null,
                  actualDate: a.actual_date ?? null,
                });
                if (computed !== null) {
                  resolvedScore = Math.max(0, Math.min(100, computed));
                }
              }
            }

            // Only plot the point when we have a real score — keeps the line
            // from dropping to zero for quarters with no meaningful data.
            if (resolvedScore !== null) {
              base[idx][a.goal_id] = resolvedScore;
            }
          });

          console.log(
            "[TrendChart] final chart data passed to Recharts:",
            base,
          );

          setTrendData(base);
          setTrendGoals(
            approvedGoals.map((g, i) => ({
              id: g.id,
              title: g.title,
              color: TREND_LINE_COLORS[i % TREND_LINE_COLORS.length],
            })),
          );
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load dashboard stats",
        );
      }
    };

    fetchStats();
  }, [profile]);

  const totalGoalsByArea = goalsByThrustArea.reduce(
    (sum, g) => sum + g.value,
    0,
  );

  const truncate = (value: string, max: number) => {
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(0, max - 1))}…`;
  };

  const plannedVsActualTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly PlannedVsActualTooltipItem[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
        <div className="text-xs font-medium text-gray-900 mb-1">
          {payload[0]?.payload?.goal}
        </div>
        <div className="space-y-1">
          {payload.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-6 text-xs"
            >
              <span className="flex items-center gap-2 text-gray-700">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </span>
              <span className="font-medium text-gray-900">{p.value ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const trendGoalTitleById = new Map(trendGoals.map((g) => [g.id, g.title]));

  const trendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
        <div className="text-xs font-medium text-gray-900 mb-1">{label}</div>
        <div className="space-y-1">
          {payload
            .filter((p: any) => p.dataKey)
            .map((p: any) => (
              <div
                key={String(p.dataKey)}
                className="flex items-center justify-between gap-6 text-xs"
              >
                <span className="flex items-center gap-2 text-gray-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {trendGoalTitleById.get(String(p.dataKey)) ??
                    String(p.dataKey)}
                </span>
                <span className="font-medium text-gray-900">
                  {toNumber(p.value).toFixed(1)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white shadow dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Employee Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">
                Welcome, {profile?.name}
              </span>
              <ThemeToggle />
              <NotificationBell />
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">My Goals</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {goalsCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Achievements
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {achievementsCount}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/employee/achievements")}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
          >
            <CheckSquare className="h-8 w-8 text-blue-600 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Input Achievements
            </h3>
            <p className="text-sm text-gray-500">Update quarterly progress</p>
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Plus className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statusLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Planned vs Actual (Q1)
            </h2>
            {plannedVsActual.length === 0 ? (
              <div className="text-sm text-gray-500">
                No approved numeric goals found.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={plannedVsActual}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient
                        id="plannedGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                      <linearGradient
                        id="actualGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#16a34a" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="goal"
                      width={160}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => truncate(String(v), 22)}
                    />
                    <Tooltip content={plannedVsActualTooltip} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="planned"
                      fill="url(#plannedGradient)"
                      name="Planned"
                      radius={[0, 8, 8, 0]}
                      barSize={14}
                    />
                    <Bar
                      dataKey="actual"
                      fill="url(#actualGradient)"
                      name="Actual"
                      radius={[0, 8, 8, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Goals by Thrust Area
            </h2>
            {goalsByThrustArea.length === 0 ? (
              <div className="text-sm text-gray-500">
                No approved goals found.
              </div>
            ) : (
              <div className="h-72 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={goalsByThrustArea}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={2}
                      labelLine={false}
                      label={({ percent }) =>
                        `${Math.round((percent ?? 0) * 100)}%`
                      }
                    >
                      {goalsByThrustArea.map((_entry, index) => (
                        <Cell
                          key={index}
                          fill={AREA_COLORS[index % AREA_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {totalGoalsByArea}
                    </div>
                    <div className="text-xs text-gray-500">Approved goals</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Achievement Trend (Q1–Q4)
          </h2>
          {trendGoals.length === 0 ? (
            <div className="text-sm text-gray-500">
              No approved goals found.
            </div>
          ) : !trendData.some((row) =>
              trendGoals.some((g) => row[g.id] !== null),
            ) ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <p className="text-gray-400 text-sm font-medium">
                No achievement data yet for Q1
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Submit your Q1 achievements to see your score trend here.
              </p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 8, right: 24, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip content={trendTooltip} />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value) =>
                      trendGoalTitleById.get(String(value)) ?? String(value)
                    }
                  />
                  {trendGoals.map((g) => (
                    <Line
                      key={g.id}
                      type="linear"
                      dataKey={g.id}
                      stroke={g.color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Goals Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">My Goals</h2>
            <button
              onClick={() => navigate("/employee/goals")}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="p-6">
            {previewGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No goals yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first goal for the current cycle.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => navigate("/employee/goals/create")}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Goal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {previewGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {g.title}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {g.status}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/employee/goals")}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
