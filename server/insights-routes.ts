import type { Express } from "express";
import { payrollPool, projectsPool, lmsPool, requirePool, timestrapPool, hrmsPool } from "./insights-db";

/* ============================================================================
 * SCHEMA CONFIG — confirmed against real schema dumps (Aug 2026).
 *
 * Punch data lives in Payroll's `attendance_logs`: one row per punch EVENT
 * (emp_code, punch_time, punch_state), not one row per day. `emp_code` is
 * a plain column on the table already, so no join to `employees` is needed.
 *
 * There is no dedicated "submitted a timesheet today" table anywhere in
 * Payroll — `timesheet_submissions` / `timesheets` are monthly summary rows
 * (working_days/present_days/missing_days), not per-day. So "submitted" for
 * the daily compliance calendar is derived the same way the Punch Data tab
 * already does: a day counts as submitted if there's attendance_logs data
 * for it. That also matches the UI copy ("Daily attendance from TimeStrap").
 * ========================================================================== */

export function registerInsightsRoutes(app: Express) {
  // ---- Punch Data (Payroll: attendance_logs) ----
  // attendance_logs is an event log (one row per punch), not one row per
  // day, so we aggregate: earliest punch of the day = punch_in, latest =
  // punch_out. This doesn't rely on knowing what punch_state's exact values
  // mean (e.g. 'IN'/'OUT' vs numeric codes), so it's robust either way.
  app.get("/api/insights/punches", async (req, res) => {
    try {
      const { employeeCode, year, month } = req.query as Record<string, string>;
      if (!employeeCode) return res.status(400).json({ error: "employeeCode is required" });

      const pool = requirePool(payrollPool, "Payroll database");
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || new Date().getMonth() + 1;

      const result = await pool.query(
        `SELECT DATE(al.punch_time) AS work_date,
                MIN(al.punch_time) AS punch_in,
                MAX(al.punch_time) AS punch_out
         FROM public.attendance_logs al
         WHERE UPPER(al.emp_code) = UPPER($1)
           AND date_part('year', al.punch_time) = $2
           AND date_part('month', al.punch_time) = $3
         GROUP BY DATE(al.punch_time)
         ORDER BY work_date ASC`,
        [employeeCode, y, m]
      );

      // Fetch approved OD dates from LMS
      let odRanges: Array<{ start_date: string; end_date: string }> = [];
      try {
        const lms = requirePool(lmsPool, "LMS database");
        const hrms = requirePool(hrmsPool, "HRMS database");
        const empNameResult = await hrms.query(
          `SELECT CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE UPPER(employee_id) = UPPER($1) LIMIT 1`,
          [employeeCode]
        );
        const empName = empNameResult.rows[0]?.name || employeeCode;

        const odResult = await lms.query(
          `SELECT l.start_date, l.end_date
           FROM leaves l
           WHERE (
             REPLACE(LOWER(l.username), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
             OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(l.username), ' ', '') || '%'
             OR REPLACE(LOWER(l.employee_name), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
             OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(l.employee_name), ' ', '') || '%'
           )
             AND LOWER(l.status) = 'approved'
             AND LOWER(l.leave_type) = 'od'
             AND l.start_date <= (make_date($2, $3, 1) + interval '1 month' - interval '1 day')
             AND l.end_date >= make_date($2, $3, 1)`,
          [empName, y, m]
        );
        odRanges = odResult.rows;
      } catch (odErr: any) {
        console.warn("[insights] OD lookup failed (non-fatal):", odErr.message);
      }

      res.json({ punches: result.rows, odRanges });
    } catch (error: any) {
      console.error("[insights] punches error:", error.message);
      res.status(error.status || 500).json({ error: error.message || "Failed to load punch data" });
    }
  });

  // ---- Timesheet Compliance (Payroll attendance + LMS leave) ----
  // "Submitted" used to be read from the HRMS `timesheets` table, which
  // doesn't reflect real day-by-day activity and made everyone show up as
  // "Missing" even when they'd worked every day (e.g. E0048). There's no
  // per-day "submitted" table in Payroll either (timesheet_submissions is a
  // monthly summary), so a day counts as submitted when there's attendance
  // data for it in `attendance_logs` — same source as the Punch Data tab.
  // Leave days come from LMS `leaves` (approved, name-matched) — confirmed
  // real, same lookup already used by /api/insights/leaves below and by the
  // working Leaves & Permissions tab.
  app.get("/api/insights/timesheet-status", async (req, res) => {
    try {
      const { employeeCode, year, month } = req.query as Record<string, string>;
      if (!employeeCode) return res.status(400).json({ error: "employeeCode is required" });

      const timestrap = requirePool(timestrapPool, "TimeStrap database");
      const lms = requirePool(lmsPool, "LMS database");
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || new Date().getMonth() + 1;

      const submittedResult = await timestrap.query(
        `SELECT DISTINCT ds.date AS entry_date
         FROM daily_submissions ds
         JOIN employees e ON e.id = ds.employee_id
         WHERE UPPER(e.employee_code) = UPPER($1)
           AND ds.date LIKE $2
         ORDER BY entry_date ASC`,
        [employeeCode, `${y}-${m.toString().padStart(2, '0')}-%`]
      );

      const hrms = requirePool(hrmsPool, "HRMS database");
      const empNameResult = await hrms.query(
        `SELECT CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE UPPER(employee_id) = UPPER($1) LIMIT 1`,
        [employeeCode]
      );
      const empName = empNameResult.rows[0]?.name || employeeCode; // fallback to code if not found

      const leaveResult = await lms.query(
        `SELECT l.start_date, l.end_date
         FROM leaves l
         WHERE (
           REPLACE(LOWER(l.username), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
           OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(l.username), ' ', '') || '%'
           OR REPLACE(LOWER(l.employee_name), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
           OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(l.employee_name), ' ', '') || '%'
         )
           AND LOWER(l.status) = 'approved'
         AND l.start_date <= (make_date($2, $3, 1) + interval '1 month' - interval '1 day')
           AND l.end_date >= make_date($2, $3, 1)`,
        [empName, y, m]
      );

      res.json({
        submittedDates: submittedResult.rows.map((r) => r.entry_date),
        leaveRanges: leaveResult.rows,
      });
    } catch (error: any) {
      console.error("[insights] timesheet-status error:", error.message);
      res.status(error.status || 500).json({ error: error.message || "Failed to load timesheet status" });
    }
  });

  // ---- Pending Projects (PMS / effilynx) ----
  // PMS.projects.title is the project name (not `name`). Membership is via
  // project_team_members, joined to PMS.employees on emp_code = E-code.
  app.get("/api/insights/projects", async (req, res) => {
    try {
      const { employeeCode } = req.query as Record<string, string>;
      if (!employeeCode) return res.status(400).json({ error: "employeeCode is required" });

      const pool = requirePool(projectsPool, "PMS database");

      const result = await pool.query(
        `SELECT DISTINCT p.id, p.title AS name, p.status, p.start_date, p.end_date AS due_date, p.progress
         FROM projects p
         LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
         LEFT JOIN project_departments pd ON pd.project_id = p.id
         JOIN employees e ON (e.id = ptm.employee_id OR e.department = pd.department)
         WHERE UPPER(e.emp_code) = UPPER($1)
         ORDER BY p.end_date ASC NULLS LAST`,
        [employeeCode]
      );

      res.json({ projects: result.rows });
    } catch (error: any) {
      console.error("[insights] projects error:", error.message);
      res.status(error.status || 500).json({ error: error.message || "Failed to load projects" });
    }
  });

  // ---- Leaves & Permissions (LMS) ----
  // LMS's `leaves`/`permissions` tables are keyed by username/employee_name,
  // not employee_code directly. We resolve employee_code -> name via LMS's
  // own `employees` table first, then match leaves.employee_name /
  // permissions.username against that name (permissions has no
  // employee_name column, only username).
  app.get("/api/insights/leaves", async (req, res) => {
    try {
      const { employeeCode, year } = req.query as Record<string, string>;
      if (!employeeCode) return res.status(400).json({ error: "employeeCode is required" });

      const pool = requirePool(lmsPool, "LMS database");
      const y = parseInt(year) || new Date().getFullYear();

      const hrms = requirePool(hrmsPool, "HRMS database");
      const empNameResult = await hrms.query(
        `SELECT CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE UPPER(employee_id) = UPPER($1) LIMIT 1`,
        [employeeCode]
      );
      const empName = empNameResult.rows[0]?.name || employeeCode;

      const result = await pool.query(
        `SELECT 'L-' || l.id AS id, (l.leave_type || ' Leave') AS type,
                l.start_date AS from_date, l.end_date AS to_date, l.status, l.reason
         FROM leaves l
         WHERE (
           REPLACE(LOWER(l.username), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
           OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(l.username), ' ', '') || '%'
           OR REPLACE(LOWER(l.employee_name), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
           OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(l.employee_name), ' ', '') || '%'
         )
           AND date_part('year', l.start_date) = $2
         UNION ALL
         SELECT 'P-' || p.id AS id, (p.permission_type || ' Permission') AS type,
                p.permission_date AS from_date, p.permission_date AS to_date, p.status, p.reason
         FROM permissions p
         WHERE (
           REPLACE(LOWER(p.username), ' ', '') LIKE '%' || REPLACE(LOWER($1::text), ' ', '') || '%'
           OR REPLACE(LOWER($1::text), ' ', '') LIKE '%' || REPLACE(LOWER(p.username), ' ', '') || '%'
         )
           AND date_part('year', p.permission_date) = $2
         ORDER BY from_date DESC`,
        [empName, y]
      );

      res.json({ leaves: result.rows });
    } catch (error: any) {
      console.error("[insights] leaves error:", error.message);
      res.status(error.status || 500).json({ error: error.message || "Failed to load leave history" });
    }
  });
}