const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.gykfyiqujyiwchqgmsjx:Rebecasuji%4013@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("LMS Tables:", tables.rows.map(r => r.table_name));

    // Check if there's an OD table
    for (const t of tables.rows) {
      if (t.table_name.toLowerCase().includes('od') || t.table_name.toLowerCase().includes('duty')) {
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [t.table_name]);
        console.log(`\nTable ${t.table_name} cols:`, cols.rows.map(r => r.column_name));
        const sample = await pool.query(`SELECT * FROM "${t.table_name}" LIMIT 3`);
        console.log(`Sample:`, sample.rows);
      }
    }

    // Also check leaves table for OD-related leave types
    const odLeaves = await pool.query("SELECT DISTINCT leave_type FROM leaves");
    console.log("\nAll leave types:", odLeaves.rows);

    // Check permissions table types
    const permTypes = await pool.query("SELECT DISTINCT permission_type FROM permissions");
    console.log("All permission types:", permTypes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
