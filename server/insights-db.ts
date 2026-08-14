import { Pool } from "pg";

/**
 * Connection pools for the systems the "Dashboard" (Employee Insights) page
 * pulls read-only data from. Each is optional at boot time — if the env var
 * isn't set, that tab's endpoints will return a clear "not configured" error
 * instead of crashing the whole server.
 */

function makePool(url: string | undefined): Pool | null {
  if (!url) return null;
  return new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  });
}

// HRMS — employee master data (added by HR). Separate from the DATABASE_URL
// used for login/employees table today, so we don't touch that flow.
export const hrmsPool = makePool(process.env.HRMS_DB_URL);

// TimeStrap — punch in/out records + timesheet submissions.
export const timestrapPool = makePool(process.env.TIMESTRAP_DB_URL);

// Payroll — tracks punch in/out (attendance_logs) and is the real source
// for both the Punch Data and Timesheet Compliance tabs. Confirmed via
// schema dump (Aug 2026) — see insights-routes.ts for table details.
export const payrollPool = makePool(process.env.PAYROLL_DATABASE_URL);

// PMS (effilynx) — projects.
export const projectsPool = makePool(process.env.PROJECTS_DB_URL);

// LMS — leaves & permissions.
export const lmsPool = makePool(process.env.LMS_DATABASE_URL);

export function requirePool(pool: Pool | null, label: string): Pool {
  if (!pool) {
    throw Object.assign(
      new Error(`${label} is not configured. Set its DB URL in .env.`),
      { status: 503 }
    );
  }
  return pool;
}