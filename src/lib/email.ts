/**
 * Redirects @demo.com addresses to the real address set in
 * VITE_DEMO_EMAIL, so test accounts still receive emails during demos.
 * All other addresses pass through unchanged.
 */
function resolveEmail(email: string): string {
  if (email.endsWith("@demo.com")) {
    return import.meta.env.VITE_DEMO_EMAIL || email;
  }
  return email;
}

/**
 * Sends an email via the /api/send-email Vercel serverless function.
 * The actual Resend API key lives server-side only (RESEND_API_KEY),
 * so the browser never sees it.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean }> {
  const actualTo = resolveEmail(to);

  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: actualTo, subject, html }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[email] send failed:", data.error);
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : JSON.stringify(data.error),
      );
    }

    return { success: true };
  } catch (err) {
    console.error("[email] sendEmail error:", err);
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export const emailTemplates = {
  /**
   * Sent to the manager when an employee submits goals for review.
   */
  goalSubmitted: (employeeName: string, goalCount: number) => ({
    subject: `[KaamKaaj] ${employeeName} has submitted goals for review`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">KaamKaaj</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Goals Submitted for Review</h2>
          <p style="color: #374151;">
            ${employeeName} has submitted <strong>${goalCount} goal${goalCount === 1 ? "" : "s"}</strong> for your approval.
          </p>
          <a href="https://kaam-kaaj-blue.vercel.app/manager/team-review"
             style="background: #6366f1; color: white; padding: 12px 24px;
             border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Review Goals
          </a>
        </div>
      </div>
    `,
  }),

  /**
   * Sent to the employee when all their goals are approved.
   */
  goalApproved: (managerName: string) => ({
    subject: `[KaamKaaj] Your goals have been approved`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">KaamKaaj</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Goals Approved ✅</h2>
          <p style="color: #374151;">
            Your goals have been approved by <strong>${managerName}</strong>.
          </p>
          <p style="color: #374151;">
            You can now view your locked goal sheet and begin tracking achievements.
          </p>
          <a href="https://kaam-kaaj-blue.vercel.app/employee/goals"
             style="background: #10b981; color: white; padding: 12px 24px;
             border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            View My Goals
          </a>
        </div>
      </div>
    `,
  }),

  /**
   * Sent to the employee when a specific goal is returned for revision.
   */
  goalReturned: (managerName: string, goalTitle: string, comment: string) => ({
    subject: `[KaamKaaj] A goal needs revision`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">KaamKaaj</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Goal Returned for Revision</h2>
          <p style="color: #374151;"><strong>${managerName}</strong> has returned your goal:</p>
          <div style="background: white; padding: 12px; border-radius: 6px;
               border-left: 4px solid #f59e0b; margin: 12px 0;">
            <p style="margin: 0; font-weight: bold; color: #111827;">${goalTitle}</p>
          </div>
          <p style="color: #374151;">Manager comment:</p>
          <div style="background: white; padding: 12px; border-radius: 6px;
               border-left: 4px solid #6366f1; margin: 12px 0;">
            <p style="margin: 0; color: #374151; font-style: italic;">"${comment}"</p>
          </div>
          <a href="https://kaam-kaaj-blue.vercel.app/employee/goals"
             style="background: #f59e0b; color: white; padding: 12px 24px;
             border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 16px;">
            Revise My Goal
          </a>
        </div>
      </div>
    `,
  }),
};
