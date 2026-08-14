// Run with: tsx script/inspect-schemas.ts
// Prints every table + its columns for each configured database, so we can
// wire server/insights-routes.ts to your real column names.
import "dotenv/config";
import { Pool } from "pg";

const targets: Record<string, string | undefined> = {
  TIMESTRAP_DB_URL: process.env.TIMESTRAP_DB_URL,
  PROJECTS_DB_URL: process.env.PROJECTS_DB_URL,
  LMS_DATABASE_URL: process.env.LMS_DATABASE_URL,
  HRMS_DB_URL: process.env.HRMS_DB_URL,
  PAYROLL_DATABASE_URL: process.env.PAYROLL_DATABASE_URL,
};

async function inspect(label: string, url: string) {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8000 });
  console.log(`\n================ ${label} ================`);
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    for (const t of tables.rows) {
      const cols = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position;`,
        [t.table_name]
      );
      console.log(`\n- ${t.table_name}`);
      for (const c of cols.rows) {
        console.log(`    ${c.column_name} (${c.data_type})`);
      }
    }
  } catch (err: any) {
    console.error(`  ! Could not inspect ${label}: ${err.message}`);
  } finally {
    await pool.end();
  }
}

(async () => {
  for (const [label, url] of Object.entries(targets)) {
    if (!url) {
      console.log(`\n================ ${label} ================\n  (not set in .env, skipped)`);
      continue;
    }
    await inspect(label, url);
  }
  process.exit(0);
})();