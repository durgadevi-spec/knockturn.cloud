const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.ztvmtxcqsgysuzmwbewo:Rebecasuji%4013@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'");
    console.log("HRMS Employees columns:", res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
