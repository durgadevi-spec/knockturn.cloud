import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { registerInsightsRoutes } from "./insights-routes";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  employeeCode: z.string().min(1, "Employee code is required"),
  password: z.string().min(1, "Password is required"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parsed.error.errors,
        });
      }

      const { username, employeeCode, password } = parsed.data;

      // Query employee by username and employeeCode
      const employee = await storage.getEmployee(username, employeeCode);

      if (!employee) {
        return res.status(401).json({
          error: "Invalid credentials. Employee not found.",
        });
      }

      // Verify password
      if (employee.password !== password) {
        return res.status(401).json({
          error: "Invalid credentials. Please check your password.",
        });
      }

      // Return employee data
      res.json({
        success: true,
        user: {
          id: employee.id,
          username: employee.username,
          employeeCode: employee.employeeCode,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // SSO hand-off to PMS — called by the dashboard's "Calendar" quick link.
  // The visitor must already be logged into knockturn.cloud; the frontend
  // sends their employeeCode, and this route asks PMS (server-to-server,
  // using a shared secret that never reaches the browser) to mint a real
  // PMS session token, then returns a URL the browser can open directly
  // into the PMS calendar, already signed in.
  app.post("/api/sso/pms-calendar", async (req, res) => {
    try {
      const { employeeCode } = req.body;
      if (!employeeCode) {
        return res.status(400).json({ error: "employeeCode required" });
      }

      const ssoSecret = process.env.PMS_SSO_SECRET;
      const pmsBaseUrl = process.env.PMS_BASE_URL || "http://147.93.28.144:5002";

      if (!ssoSecret) {
        console.error("[SSO] PMS_SSO_SECRET is not set on the knockturn.cloud server");
        return res.status(503).json({ error: "SSO not configured" });
      }

      const pmsRes = await fetch(`${pmsBaseUrl}/api/sso/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode, ssoSecret }),
      });

      if (!pmsRes.ok) {
        const errBody = await pmsRes.json().catch(() => ({}));
        return res.status(pmsRes.status).json({ error: errBody.error || "PMS SSO failed" });
      }

      const { token } = await pmsRes.json();
      res.json({ url: `${pmsBaseUrl}/calendar?sso_token=${token}` });
    } catch (error) {
      console.error("PMS SSO error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Punch data / timesheet compliance / projects / leaves for the
  // "Dashboard" (Employee Insights) page.
  registerInsightsRoutes(app);

  // Get all employees (for debugging/admin purposes)
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
