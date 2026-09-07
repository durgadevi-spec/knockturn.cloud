import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { Pool, type PoolClient } from "pg";
import { lmsPool, primaryPool, projectsPool, requirePool, timestrapPool } from "./insights-db";

export interface ProvisionEmployeeInput {
  name: string;
  employeeCode: string;
  password: string;
  role: "employee" | "hr" | "admin";
  email?: string;
  department?: string;
}

interface CreatedRecord {
  pool: Pool;
  id: string;
  table: string;
  idColumn: string;
}

function normalize(input: ProvisionEmployeeInput) {
  return {
    name: input.name.trim(),
    employeeCode: input.employeeCode.trim().toUpperCase(),
    password: input.password,
    role: input.role,
    email: input.email?.trim() || null,
    department: input.department?.trim() || "General",
  };
}

function departmentCode(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "GENERAL";
}

async function withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function ensureCodeIsAvailable(client: PoolClient, query: string, code: string, label: string) {
  const result = await client.query(query, [code]);
  if (result.rowCount) throw new Error(`${label} already has employee code ${code}`);
}

async function ensurePoolCodeIsAvailable(pool: Pool, query: string, code: string, label: string) {
  const result = await pool.query(query, [code]);
  if (result.rowCount) throw new Error(`${label} already has employee code ${code}`);
}

async function ensureUsernameIsAvailable(pool: Pool, username: string, label: string) {
  const result = await pool.query("SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1", [username]);
  if (result.rowCount) {
    throw Object.assign(
      new Error(`${label} already has username "${username}". Use a different full name.`),
      { status: 409 }
    );
  }
}

async function ensureDepartment(client: PoolClient, name: string, code?: string) {
  if (code) {
    await client.query(
      `INSERT INTO departments (name, code)
       VALUES ($1, $2)
        ON CONFLICT DO NOTHING`,
      [name, code]
    );
    return;
  }

  await client.query(
    `INSERT INTO departments (name)
     VALUES ($1)
     ON CONFLICT (name) DO NOTHING`,
    [name]
  );
}

export async function provisionEmployee(input: ProvisionEmployeeInput) {
  const employee = normalize(input);
  if (!employee.name || !employee.employeeCode || !employee.password) {
    throw Object.assign(new Error("Name, employee code, and password are required"), { status: 400 });
  }

  const central = requirePool(primaryPool, "Central database");
  const timestrap = requirePool(timestrapPool, "TimeStrap database");
  const pms = requirePool(projectsPool, "PMS database");
  const lms = requirePool(lmsPool, "LMS database");
  const centralId = randomUUID();
  const pmsEmployeeId = randomUUID();
  const pmsUserId = randomUUID();
  const created: CreatedRecord[] = [];
  const timestrapPassword = await bcrypt.hash(employee.password, 10);

  try {
    await ensureUsernameIsAvailable(pms, employee.name, "PMS");
    await ensureUsernameIsAvailable(lms, employee.name, "LMS");
    await ensurePoolCodeIsAvailable(
      lms,
      "SELECT 1 FROM employees WHERE employee_code = $1",
      employee.employeeCode,
      "LMS"
    );

    await withTransaction(central, async (client) => {
      await ensureCodeIsAvailable(client, "SELECT 1 FROM employees WHERE employee_code = $1", employee.employeeCode, "Central database");
      await client.query(
        `INSERT INTO employees (id, username, employee_code, password, is_admin)
         VALUES ($1, $2, $3, $4, $5)`,
        [centralId, employee.name, employee.employeeCode, employee.password, employee.role === "admin"]
      );
      created.push({ pool: central, id: centralId, table: "employees", idColumn: "id" });
    });

    await withTransaction(timestrap, async (client) => {
      await ensureCodeIsAvailable(client, "SELECT 1 FROM employees WHERE employee_code = $1", employee.employeeCode, "TimeStrap");
      await ensureDepartment(client, employee.department, departmentCode(employee.department));
      await client.query(
        `INSERT INTO employees (id, name, email, employee_code, password, role, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [centralId, employee.name, employee.email, employee.employeeCode, timestrapPassword, employee.role, employee.department]
      );
      created.push({ pool: timestrap, id: centralId, table: "employees", idColumn: "id" });
    });
    await withTransaction(pms, async (client) => {
      await ensureDepartment(client, employee.department);
      await client.query(
        `INSERT INTO employees (id, name, designation, department, emp_code, email)
         VALUES ($1, $2, NULL, $3, $4, $5)`,
        [pmsEmployeeId, employee.name, employee.department, employee.employeeCode, employee.email]
      );
      await client.query(
        `INSERT INTO users (id, username, password, employee_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [pmsUserId, employee.name, employee.password, pmsEmployeeId, employee.role.toUpperCase()]
      );
      created.push({ pool: pms, id: pmsUserId, table: "users", idColumn: "id" });
      created.push({ pool: pms, id: pmsEmployeeId, table: "employees", idColumn: "id" });
    });

    await withTransaction(lms, async (client) => {
      await client.query(
        `INSERT INTO employees (id, employee_code, name, designation, role, join_date)
         VALUES ($1, $2, $3, NULL, $4, CURRENT_DATE)`,
        [pmsEmployeeId, employee.employeeCode, employee.name, employee.role]
      );
      await client.query(
        `INSERT INTO users (user_id, username, password, role, email)
         VALUES ($1, $2, $3, $4, $5)`,
        [employee.employeeCode, employee.name, employee.password, employee.role, employee.email]
      );
      created.push({ pool: lms, id: pmsEmployeeId, table: "employees", idColumn: "id" });
      created.push({ pool: lms, id: employee.employeeCode, table: "users", idColumn: "user_id" });
    });

  } catch (error) {
    for (const record of created.reverse()) {
      await record.pool.query(`DELETE FROM ${record.table} WHERE ${record.idColumn} = $1`, [record.id]).catch((rollbackError) => {
        console.error("Employee compensation delete failed:", rollbackError);
      });
    }
    throw error;
  }

  return { id: centralId, employeeCode: employee.employeeCode };
}

export async function deleteEmployeeEverywhere(employeeCode: string) {
  const code = employeeCode.trim().toUpperCase();
  if (!code) throw Object.assign(new Error("Employee code is required"), { status: 400 });

  const central = requirePool(primaryPool, "Central database");
  const timestrap = requirePool(timestrapPool, "TimeStrap database");
  const pms = requirePool(projectsPool, "PMS database");
  const lms = requirePool(lmsPool, "LMS database");

  const centralEmployee = await central.query("SELECT id, username FROM employees WHERE employee_code = $1", [code]);
  if (!centralEmployee.rowCount) throw Object.assign(new Error("Employee not found"), { status: 404 });
  const { id: centralId, username } = centralEmployee.rows[0];

  await withTransaction(timestrap, async (client) => {
    await client.query("DELETE FROM employees WHERE employee_code = $1", [code]);
  });
  await withTransaction(pms, async (client) => {
    await client.query("DELETE FROM users WHERE employee_id IN (SELECT id FROM employees WHERE emp_code = $1)", [code]);
    await client.query("DELETE FROM employees WHERE emp_code = $1", [code]);
  });
  await withTransaction(lms, async (client) => {
    await client.query("DELETE FROM users WHERE user_id = $1 OR username = $2 OR user_id = $3", [centralId, username, code]);
    await client.query("DELETE FROM employees WHERE employee_code = $1", [code]);
  });
  await withTransaction(central, async (client) => {
    await client.query("DELETE FROM employee_app_access WHERE employee_id = $1", [centralId]);
    await client.query("DELETE FROM employees WHERE id = $1", [centralId]);
  });

  return { employeeCode: code };
}