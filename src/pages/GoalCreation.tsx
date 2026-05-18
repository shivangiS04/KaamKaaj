import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Save, Send, Plus, X } from "lucide-react";
import { sendEmail, emailTemplates } from "../lib/email";
import { NotificationBell } from "../components/NotificationBell";
import { ThemeToggle } from "../components/ThemeToggle";

interface Goal {
  id?: string;
  title: string;
  description: string;
  thrust_area: string;
  uom_type: "numeric_min" | "numeric_max" | "timeline" | "zero";
  target_value: number | null;
  target_date: string | null;
  weightage: number;
  status: "draft" | "submitted";
}

const THRUST_AREAS = [
  "Revenue Growth",
  "Customer Satisfaction",
  "Product Innovation",
  "Team Development",
  "Operational Excellence",
  "Strategic Initiatives",
  "Compliance & Risk",
  "Other",
];

const UOM_TYPES = [
  { value: "numeric_min", label: "Numeric Min (higher is better)" },
  { value: "numeric_max", label: "Numeric Max (lower is better)" },
  { value: "timeline", label: "Timeline (date-based)" },
  { value: "zero", label: "Zero-based (target = 0)" },
];

export const GoalCreation: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([
    {
      title: "",
      description: "",
      thrust_area: "",
      uom_type: "numeric_min",
      target_value: null,
      target_date: null,
      weightage: 0,
      status: "draft",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCycle, setActiveCycle] = useState<any>(null);

  useEffect(() => {
    fetchActiveCycle();
  }, []);

  const fetchActiveCycle = async () => {
    const { data, error } = await supabase
      .from("goal_cycles")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error) {
      setError("No active goal cycle found. Please contact administrator.");
    } else {
      setActiveCycle(data);
    }
  };

  const validateGoals = (): string | null => {
    // Check if all required fields are filled
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      if (!goal.title.trim()) return `Goal ${i + 1}: Title is required`;
      if (!goal.thrust_area) return `Goal ${i + 1}: Thrust Area is required`;
      if (!goal.uom_type) return `Goal ${i + 1}: UoM Type is required`;

      if (goal.uom_type === "timeline" && !goal.target_date) {
        return `Goal ${i + 1}: Target Date is required for Timeline type`;
      }
      if (
        goal.uom_type !== "timeline" &&
        goal.uom_type !== "zero" &&
        !goal.target_value
      ) {
        return `Goal ${i + 1}: Target Value is required`;
      }

      if (goal.weightage < 10) return `Goal ${i + 1}: Minimum weightage is 10%`;
      if (goal.weightage > 100)
        return `Goal ${i + 1}: Maximum weightage is 100%`;
    }

    // Check total weightage equals 100%
    const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if (totalWeightage !== 100) {
      return `Total weightage must equal 100%. Current total: ${totalWeightage}%`;
    }

    // Check maximum 8 goals
    if (goals.length > 8) {
      return "Maximum 8 goals allowed per cycle";
    }

    return null;
  };

  const addGoal = () => {
    if (goals.length >= 8) {
      setError("Maximum 8 goals allowed per cycle");
      return;
    }
    setGoals([
      ...goals,
      {
        title: "",
        description: "",
        thrust_area: "",
        uom_type: "numeric_min",
        target_value: null,
        target_date: null,
        weightage: 0,
        status: "draft",
      },
    ]);
  };

  const removeGoal = (index: number) => {
    if (goals.length === 1) {
      setError("At least one goal is required");
      return;
    }
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof Goal, value: any) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    setGoals(updatedGoals);
  };

  const saveAsDraft = async () => {
    const validationError = validateGoals();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!activeCycle) {
      setError("No active goal cycle found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Delete existing draft goals for this user and cycle
      await supabase
        .from("goals")
        .delete()
        .eq("employee_id", user!.id)
        .eq("goal_cycle_id", activeCycle.id)
        .eq("status", "draft");

      // Insert new draft goals
      const goalsToInsert = goals.map((goal) => ({
        employee_id: user!.id,
        goal_cycle_id: activeCycle.id,
        title: goal.title,
        description: goal.description || null,
        thrust_area: goal.thrust_area,
        uom_type: goal.uom_type,
        target_value: goal.target_value,
        target_date: goal.target_date,
        weightage: goal.weightage,
        status: "draft",
        is_shared: false,
        is_locked: false,
      }));

      const { error } = await supabase.from("goals").insert(goalsToInsert);

      if (error) throw error;

      navigate("/employee");
    } catch (err: any) {
      setError(err.message || "Failed to save goals");
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async () => {
    const validationError = validateGoals();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!activeCycle) {
      setError("No active goal cycle found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Delete existing draft goals for this user and cycle
      await supabase
        .from("goals")
        .delete()
        .eq("employee_id", user!.id)
        .eq("goal_cycle_id", activeCycle.id)
        .eq("status", "draft");

      // Insert new submitted goals
      const goalsToInsert = goals.map((goal) => ({
        employee_id: user!.id,
        goal_cycle_id: activeCycle.id,
        title: goal.title,
        description: goal.description || null,
        thrust_area: goal.thrust_area,
        uom_type: goal.uom_type,
        target_value: goal.target_value,
        target_date: goal.target_date,
        weightage: goal.weightage,
        status: "submitted",
        is_shared: false,
        is_locked: false,
      }));

      const { error } = await supabase.from("goals").insert(goalsToInsert);

      if (error) throw error;

      // Send email notification to manager (fire-and-forget — never blocks navigation)
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, manager_id")
          .eq("id", user!.id)
          .single();

        if (profileData?.manager_id) {
          const { data: managerData } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", profileData.manager_id)
            .single();

          if (managerData?.email) {
            const employeeName = profileData.name || "An employee";
            const { subject, html } = emailTemplates.goalSubmitted(
              employeeName,
              goalsToInsert.length,
            );
            await sendEmail(managerData.email, subject, html);
          }
        }
      } catch (emailErr) {
        // Email failure must never block the user — log and continue
        console.error(
          "[GoalCreation] Manager notification email failed:",
          emailErr,
        );
      }

      navigate("/employee");
    } catch (err: any) {
      setError(err.message || "Failed to submit goals");
    } finally {
      setLoading(false);
    }
  };

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white shadow dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/employee")}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Create Goals
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Weightage Summary */}
        <div
          className={`mb-6 p-4 rounded-lg ${totalWeightage === 100 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"} border`}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Weightage:</span>
            <span
              className={`text-2xl font-bold ${totalWeightage === 100 ? "text-green-700" : "text-yellow-700"}`}
            >
              {totalWeightage}%
            </span>
          </div>
          <p className="text-sm mt-1 text-gray-600">
            {totalWeightage === 100
              ? "Perfect! Total weightage equals 100%"
              : `Total must equal 100% (current: ${totalWeightage}%)`}
          </p>
        </div>

        {/* Goals Form */}
        <div className="space-y-6">
          {goals.map((goal, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Goal {index + 1}
                </h3>
                {goals.length > 1 && (
                  <button
                    onClick={() => removeGoal(index)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => updateGoal(index, "title", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter goal title"
                  />
                </div>

                {/* Thrust Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thrust Area *
                  </label>
                  <select
                    value={goal.thrust_area}
                    onChange={(e) =>
                      updateGoal(index, "thrust_area", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select thrust area</option>
                    {THRUST_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                {/* UoM Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit of Measurement *
                  </label>
                  <select
                    value={goal.uom_type}
                    onChange={(e) =>
                      updateGoal(index, "uom_type", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {UOM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Value or Date */}
                {goal.uom_type === "timeline" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Date *
                    </label>
                    <input
                      type="date"
                      value={goal.target_date || ""}
                      onChange={(e) =>
                        updateGoal(index, "target_date", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : goal.uom_type !== "zero" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Value *
                    </label>
                    <input
                      type="number"
                      value={goal.target_value || ""}
                      onChange={(e) =>
                        updateGoal(
                          index,
                          "target_value",
                          parseFloat(e.target.value) || null,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter target value"
                    />
                  </div>
                ) : null}

                {/* Weightage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weightage (%) * (min 10%)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={goal.weightage}
                    onChange={(e) =>
                      updateGoal(
                        index,
                        "weightage",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={goal.description}
                    onChange={(e) =>
                      updateGoal(index, "description", e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter goal description (optional)"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Goal Button */}
          {goals.length < 8 && (
            <button
              onClick={addGoal}
              className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Another Goal
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={saveAsDraft}
              disabled={loading}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5 mr-2" />
              Save as Draft
            </button>
            <button
              onClick={submitForApproval}
              disabled={loading || totalWeightage !== 100}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5 mr-2" />
              Submit for Approval
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
