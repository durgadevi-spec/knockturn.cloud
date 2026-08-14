import { type User, type InsertUser, type Employee } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { employees as employeesTable, users as usersTable } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getEmployee(
    username: string,
    employeeCode: string
  ): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEmployee(): Promise<Employee | undefined> {
    throw new Error("MemStorage does not support employees");
  }

  async getAllEmployees(): Promise<Employee[]> {
    throw new Error("MemStorage does not support employees");
  }
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.db = drizzle(pool);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db
      .insert(usersTable)
      .values(insertUser)
      .returning();
    return result[0];
  }

  async getEmployee(
    username: string,
    employeeCode: string
  ): Promise<Employee | undefined> {
    const result = await this.db
      .select()
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.username, username.trim()),
          eq(employeesTable.employeeCode, employeeCode.trim().toUpperCase())
        )
      )
      .limit(1);
    return result[0];
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await this.db.select().from(employeesTable);
  }
}

// Use DatabaseStorage in production, MemStorage in test
let storage: IStorage;

if (process.env.DATABASE_URL) {
  storage = new DatabaseStorage();
} else {
  console.warn(
    "⚠️  DATABASE_URL not set. Using in-memory storage (data will be lost on restart)"
  );
  storage = new MemStorage();
}

export { storage };
