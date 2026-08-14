# Database Setup Guide for Knockturn Dashboard

## Database Information
- **Database Provider:** Supabase PostgreSQL
- **Connection String:** `postgresql://postgres.kiwadkitaoevzzjsktam:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres`
- **Password:** `Durgadevi@67`

## Setup Steps

### 1. Set Environment Variable
Create a `.env` file in the project root (or update your existing one):

```bash
DATABASE_URL=postgresql://postgres.kiwadkitaoevzzjsktam:Durgadevi@67@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### 2. Create Database Tables
Run the Drizzle migrations to create the tables:

```bash
npm run db:push
```

This will:
- Create the `users` table (for future use)
- Create the `employees` table with the following columns:
  - `id` (UUID, primary key)
  - `username` (text, unique)
  - `employee_code` (text, unique)
  - `password` (text)
  - `created_at` (timestamp)

### 3. Seed Employee Data
Run the seed script to populate the database with all 18 employees:

```bash
tsx script/seed.ts
```

This will:
- Clear existing employees from the database
- Insert all 18 employees with their credentials:
  - Username: Employee's full name
  - Employee Code: E-codes (or "-" for special cases)
  - Password: `admin123` (default password)

### 4. Start the Application
After seeding, start the development server:

```bash
npm run dev
```

The app will run on `http://localhost:5000`

## Login Process
The login now works as follows:

1. User enters username, employee code, and password
2. Frontend sends credentials to `/api/auth/login` endpoint
3. Backend queries the employees table for matching credentials
4. If valid, returns user data and allows login
5. User data is stored in localStorage

## Employee List
The database now contains the following 18 employees:

| # | Username | Employee Code |
|---|----------|---|
| 1 | MOHAN RAJ C | E0041 |
| 2 | YUVARAJ S | E0042 |
| 3 | SIVARAM C | E0032 |
| 4 | UMAR FAROOQUE | E0040 |
| 5 | KAALIPUSHPA | E0028 |
| 6 | RANJITH | E0009 |
| 7 | FAREETHA | - |
| 8 | Samyuktha S | E0047 |
| 9 | Rebecasuji.A | E0046 |
| 10 | DurgaDevi E | E0048 |
| 11 | ZAMEELA BEGAM N | E0050 |
| 12 | ARUN KUMAR V | E0051 |
| 13 | D K JYOTHSNA PRIYA | E0052 |
| 14 | P PUSHPA | E0049 |
| 15 | KIRUBA | E0054 |
| 16 | S.NAVEEN KUMAR | E0053 |
| 17 | Leocelestine | E0002 |
| 18 | Samprakash | E0001 |

All use password: `admin123`

## Technical Changes Made

### 1. Schema Updates (`shared/schema.ts`)
- Added `employees` table with UUID id, username, employeeCode, password, and createdAt
- Created insert schema and types for employees

### 2. Seed Script (`script/seed.ts`)
- New script to populate database with employee data
- Clears existing data and inserts fresh data

### 3. Server Storage (`server/storage.ts`)
- Updated to use Drizzle ORM with PostgreSQL
- Added `DatabaseStorage` class for database operations
- Added methods:
  - `getEmployee(username, employeeCode)` - Query employees by credentials
  - `getAllEmployees()` - Fetch all employees

### 4. API Routes (`server/routes.ts`)
- Created `/api/auth/login` POST endpoint
- Validates credentials against database
- Returns user data on successful login

### 5. Frontend Login (`client/src/pages/login.tsx`)
- Removed hardcoded credentials
- Updated to make API call to `/api/auth/login`
- Improved error handling and loading states

## Troubleshooting

### Connection Issues
If you get a connection error:
1. Verify DATABASE_URL in `.env` is correct
2. Check that your IP is whitelisted in Supabase
3. Ensure the password is correct: `Durgadevi@67`

### Table Not Created
If tables don't exist after `npm run db:push`:
1. Check DATABASE_URL is set correctly
2. Ensure you have network access to Supabase
3. Run migrations again: `npm run db:push`

### Seed Script Fails
If the seed script fails:
1. Ensure tables are created first (`npm run db:push`)
2. Check DATABASE_URL environment variable
3. Verify database connectivity

## Security Notes

⚠️ **Important:** The password `admin123` stored in the database is the default. For production:
1. Implement proper password hashing (bcrypt)
2. Use environment variables for sensitive data
3. Implement JWT tokens for session management
4. Add password reset functionality
5. Implement rate limiting on login attempts
