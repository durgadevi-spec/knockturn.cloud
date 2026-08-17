
// One-off helper for granting/revoking the isAdmin flag, since there's no
// UI for managing admins themselves (only for what admins can assign).
//
// Usage:
//   npx tsx script/set-admin.ts E0041          # make E0041 an admin
//   npx tsx script/set-admin.ts E0041 --revoke # remove admin from E0041
//   npx tsx script/set-admin.ts --list         # list current admins

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { employees } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    try {
        const args = process.argv.slice(2);

        if (args.includes("--list")) {
            const admins = await db
                .select()
                .from(employees)
                .where(eq(employees.isAdmin, true));
            console.log(
                admins.length
                    ? admins.map((a) => `${a.employeeCode}  ${a.username}`).join("\n")
                    : "No admins set yet."
            );
            return;
        }

        const employeeCode = args[0];
        if (!employeeCode) {
            throw new Error(
                "Usage: npx tsx script/set-admin.ts <EMPLOYEE_CODE> [--revoke]"
            );
        }

        const grant = !args.includes("--revoke");

        const result = await db
            .update(employees)
            .set({ isAdmin: grant })
            .where(eq(employees.employeeCode, employeeCode.trim().toUpperCase()))
            .returning();

        if (!result[0]) {
            throw new Error(`No employee found with code ${employeeCode}`);
        }

        console.log(
            `✅ ${result[0].username} (${result[0].employeeCode}) is now ${grant ? "an admin" : "no longer an admin"
            }.`
        );
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error("❌", error.message || error);
    process.exit(1);
});