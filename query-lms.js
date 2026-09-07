const { Pool } = require("pg");

const lmsPool = new Pool({
  connectionString: "postgresql://postgres:postgres@localhost:5432/knockturn_lms"
});

async function run() {
  try {
    const res = await lmsPool.query("SELECT * FROM leaves WHERE LOWER(status) = 'approved'");
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    lmsPool.end();
  }
}

run();
