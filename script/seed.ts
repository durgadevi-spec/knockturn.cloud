import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { employees } from "../shared/schema";
import { sql } from "drizzle-orm";

const EMPLOYEE_DATA = [
  { username: "MOHAN RAJ C", employeeCode: "E0041" },
  { username: "YUVARAJ S", employeeCode: "E0042" },
  { username: "SIVARAM C", employeeCode: "E0032" },
  { username: "UMAR FAROOQUE", employeeCode: "E0040" },
  { username: "KAALIPUSHPA", employeeCode: "E0028" },
  { username: "RANJITH", employeeCode: "E0009" },
  { username: "FAREETHA", employeeCode: "-" },
  { username: "Samyuktha S", employeeCode: "E0047" },
  { username: "Rebecasuji.A", employeeCode: "E0046" },
  { username: "DurgaDevi E", employeeCode: "E0048" },
  { username: "ZAMEELA BEGAM N", employeeCode: "E0050" },
  { username: "ARUN KUMAR V", employeeCode: "E0051" },
  { username: "D K JYOTHSNA PRIYA", employeeCode: "E0052" },
  { username: "P PUSHPA", employeeCode: "E0049" },
  { username: "KIRUBA", employeeCode: "E0054" },
  { username: "S.NAVEEN KUMAR", employeeCode: "E0053" },
  { username: "Leocelestine", employeeCode: "E0002" },
  { username: "Samprakash", employeeCode: "E0001" },
];

const PASSWORD = "admin123";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const db = drizzle(pool);

    // Clear existing employees
    await db.delete(employees);

    // Insert all employees
    for (const emp of EMPLOYEE_DATA) {
      await db.insert(employees).values({
        username: emp.username.trim(),
        employeeCode: emp.employeeCode.trim(),
        password: PASSWORD,
      });
    }

    console.log(`✅ Successfully seeded ${EMPLOYEE_DATA.length} employees`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
