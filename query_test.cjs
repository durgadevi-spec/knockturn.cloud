const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.cwjkvasixpmieeuaield:Rebecasuji%4013@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => {
  return client.query("SELECT ds.date FROM daily_submissions ds JOIN employees e ON e.id = ds.employee_id WHERE e.employee_code = 'E0048'");
}).then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
