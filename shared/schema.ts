import { sql } from "drizzle-orm";
import { boolean, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  employeeCode: text("employee_code").notNull().unique(),
  password: text("password").notNull(),
  createdAt: varchar("created_at").default(sql`now()`),
  // Marks this employee as an admin — admins see the "Settings" button on
  // the dashboard and can assign which apps other employees can access.
  isAdmin: boolean("is_admin").notNull().default(false),
});

// Per-employee, per-app overrides for the "Quick Access" app tiles on the
// dashboard. If no row exists for a given (employeeId, appId) pair, the
// dashboard falls back to that app's built-in default (open to everyone,
// or one of the ALLOWED_*_EMPLOYEE_CODES lists) so existing behavior is
// unaffected until an admin explicitly changes something here.
export const employeeAppAccess = pgTable(
  "employee_app_access",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    employeeId: varchar("employee_id").notNull(),
    appId: text("app_id").notNull(),
    granted: boolean("granted").notNull(),
    updatedAt: varchar("updated_at").default(sql`now()`),
  },
  (table) => ({
    employeeAppUnique: uniqueIndex("employee_app_access_employee_id_app_id_idx").on(
      table.employeeId,
      table.appId
    ),
  })
);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).pick({
  username: true,
  employeeCode: true,
  password: true,
});

export const insertEmployeeAppAccessSchema = createInsertSchema(
  employeeAppAccess
).pick({
  employeeId: true,
  appId: true,
  granted: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployeeAppAccess = z.infer<
  typeof insertEmployeeAppAccessSchema
>;
export type EmployeeAppAccess = typeof employeeAppAccess.$inferSelect;