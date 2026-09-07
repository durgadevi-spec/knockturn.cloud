const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.ztvmtxcqsgysuzmwbewo:Rebecasuji%4013@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const e = await pool.query("SELECT * FROM employees WHERE UPPER(employee_code) = 'E0041'");
    console.log("HRMS Employees matching E0041:", e.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
