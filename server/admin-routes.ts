import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { APP_CATALOG, isAppAllowedByDefault } from "@shared/app-catalog";
import { deleteEmployeeEverywhere, provisionEmployee } from "./employee-provisioning";

// The app has no session/auth tokens today (login just returns the
// employee record to the client, which the client trusts). To keep this
// feature simple and consistent with how the rest of the app works, admin
// requests identify the caller via an `x-employee-code` header, and the
// server independently checks that employee's isAdmin flag in the
// database — the client cannot simply claim to be an admin.
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const employeeCode = req.header("x-employee-code");
        if (!employeeCode) {
            return res.status(401).json({ error: "Missing employee code" });
        }

        const employee = await storage.getEmployeeByCode(employeeCode);
        if (!employee || !employee.isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        next();
    } catch (error) {
        console.error("Admin auth check failed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

function resolveAccessMap(
    employeeCode: string,
    overrides: { appId: string; granted: boolean }[]
) {
    const overrideMap = new Map(overrides.map((o) => [o.appId, o.granted]));
    const access: Record<string, boolean> = {};
    for (const app of APP_CATALOG) {
        access[app.id] = overrideMap.has(app.id)
            ? (overrideMap.get(app.id) as boolean)
            : isAppAllowedByDefault(app.id, employeeCode);
    }
    return access;
}

export function registerAdminRoutes(app: Express) {
    // The static app catalog (id/title + default access rule) — lets the
    // admin UI render the list of apps without hardcoding it a second time.
    app.get("/api/admin/apps", requireAdmin, async (_req, res) => {
        res.json(APP_CATALOG.map(({ id, title }) => ({ id, title })));
    });

    // All employees (minus password) plus their resolved app access, for
    // the "assign apps to employees" screen.
    app.get("/api/admin/employees", requireAdmin, async (_req, res) => {
        try {
            const [employees, allAccess] = await Promise.all([
                storage.getAllEmployees(),
                storage.getAllAppAccess(),
            ]);

            const overridesByEmployee = new Map<
                string,
                { appId: string; granted: boolean }[]
            >();
            for (const row of allAccess) {
                const list = overridesByEmployee.get(row.employeeId) ?? [];
                list.push({ appId: row.appId, granted: row.granted });
                overridesByEmployee.set(row.employeeId, list);
            }

            const result = employees.map((emp) => ({
                id: emp.id,
                username: emp.username,
                employeeCode: emp.employeeCode,
                isAdmin: emp.isAdmin,
                appAccess: resolveAccessMap(
                    emp.employeeCode,
                    overridesByEmployee.get(emp.id) ?? []
                ),
            }));

            res.json(result);
        } catch (error) {
            console.error("Error fetching employees for admin:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    const updateAccessSchema = z.object({
        employeeId: z.string().min(1),
        appId: z.string().min(1),
        granted: z.boolean(),
    });

    const employeeSchema = z.object({
        name: z.string().trim().min(1),
        employeeCode: z.string().trim().min(1).max(50),
        password: z.string().min(1),
        role: z.enum(["employee", "hr", "admin"]),
        email: z.string().trim().email().optional().or(z.literal("")),
        department: z.string().trim().max(120).optional(),
    });

    app.post("/api/admin/employees", requireAdmin, async (req, res) => {
        try {
            const parsed = employeeSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: "Invalid employee details", details: parsed.error.errors });
            }
            const result = await provisionEmployee(parsed.data);
            res.status(201).json({ success: true, employee: result });
        } catch (error: any) {
            console.error("Error provisioning employee:", error);
            res.status(error.status || (error.code === "23505" ? 409 : 500)).json({
                error: error.code === "23505"
                    ? "An employee with one of these details already exists in a connected system"
                    : error.message || "Failed to add employee",
            });
        }
    });

    app.delete("/api/admin/employees/:employeeCode", requireAdmin, async (req, res) => {
        try {
            const result = await deleteEmployeeEverywhere(req.params.employeeCode);
            res.json({ success: true, employee: result });
        } catch (error: any) {
            console.error("Error deleting employee everywhere:", error);
            res.status(error.status || 500).json({ error: error.message || "Failed to delete employee" });
        }
    });

    // Grant or revoke a single employee's access to a single app.
    app.put("/api/admin/app-access", requireAdmin, async (req, res) => {
        try {
            const parsed = updateAccessSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    error: "Invalid request body",
                    details: parsed.error.errors,
                });
            }

            const { employeeId, appId, granted } = parsed.data;

            if (!APP_CATALOG.some((a) => a.id === appId)) {
                return res.status(400).json({ error: "Unknown app id" });
            }

            const employee = await storage.getEmployeeById(employeeId);
            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            const result = await storage.setAppAccess(employeeId, appId, granted);
            res.json({ success: true, access: result });
        } catch (error) {
            console.error("Error updating app access:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
}

// Used by the dashboard (any logged-in employee, not just admins) to
// resolve which apps they personally can see.
export async function getResolvedAppAccessForEmployee(employeeCode: string) {
    const employee = await storage.getEmployeeByCode(employeeCode);
    if (!employee) return null;

    const overrides = await storage.getAppAccessForEmployee(employee.id);
    return resolveAccessMap(employeeCode, overrides);
}