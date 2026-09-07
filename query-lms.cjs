const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.gykfyiqujyiwchqgmsjx:Rebecasuji%4013@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    const res = await pool.query("SELECT * FROM employees WHERE UPPER(employee_code) = 'E0046'");
    console.log('Employees:', res.rows);
    
    if (res.rows.length > 0) {
      const name = res.rows[0].name;
      console.log('Found name:', name);
      const leaves = await pool.query("SELECT * FROM leaves WHERE employee_name = $1 OR username = $1", [name]);
      console.log('Leaves:', leaves.rows);
      
      const permissions = await pool.query("SELECT * FROM permissions WHERE username = $1", [name]);
      console.log('Permissions:', permissions.rows);
    } else {
        // Let's see if Rebecasuji exists at all
        const res2 = await pool.query("SELECT * FROM employees WHERE name ILIKE '%Rebeca%'");
        console.log('Employees named Rebeca:', res2.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
