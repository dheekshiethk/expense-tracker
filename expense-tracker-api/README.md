# Expense tracker organization API

Express and MongoDB API for a single organization. Employees have individual accounts and can access only their own transactions. Admins can add employees, set salary and department/job title, approve sign-up requests, and reset employee passwords. As requested, admins do not have access to employees' transactions. Employees can view their own salary; only admins can edit salary.

## Run locally

1. Install Node.js 18.18 or newer and start MongoDB.
2. Copy the example environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Create the first administrator interactively:

   ```powershell
   npm run create-admin
   ```

   The command prompts for the admin name, email, and password. Password input is hidden and must be at least 12 characters. It only creates an account if no administrator exists. Existing administrators are preserved. No default administrator credentials are stored in the application configuration.
   To change the existing administrator's email or password, run `npm run set-admin-credentials`. It prompts for the new values, hides the password, and revokes existing sessions.
4. Start the API:

   ```powershell
   npm install
   npm run dev
   ```

The API listens on `http://localhost:5000` and binds to loopback by default. Change `MONGODB_URI` and `CLIENT_ORIGIN` in `.env` if needed. On startup, the API assigns old unowned transactions and the legacy wallet name to an existing administrator.

Admins set an employee's initial password when creating the account; password changes can also be requested in the employee directory. Employee self-sign-ups remain pending until an administrator approves them. Passwords are stored as salted scrypt hashes; sessions use random, server-stored tokens in `HttpOnly`, `SameSite=Lax` cookies.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API and database status |
| `POST` | `/api/auth/register` | Submit an employee sign-up for approval |
| `POST` | `/api/auth/login` | Sign in as an admin or employee |
| `GET` | `/api/auth/me` | Read the signed-in profile |
| `PUT` | `/api/auth/password` | Change the signed-in user's password |
| `POST` | `/api/auth/logout` | End the current session |
| `GET` | `/api/profile` | Read own profile, including own salary |
| `PUT` | `/api/profile` | Update own name, department, and job title |
| `GET` | `/api/users` | Admin: list employee profiles and salaries |
| `POST` | `/api/users` | Admin: create an employee and issue a temporary password |
| `PUT` | `/api/users/:id` | Admin: update employee profile and salary |
| `POST` | `/api/users/:id/approve` | Admin: approve a pending sign-up |
| `POST` | `/api/users/:id/reset-password` | Admin: reset an employee password |
| `POST` | `/api/users/:id/deactivate` | Admin: deactivate an employee account |
| `POST` | `/api/users/:id/activate` | Admin: reactivate an employee account |
| `GET` | `/api/transactions?month=YYYY-MM` | List the signed-in user's transactions |
| `POST` | `/api/transactions` | Create a transaction for the signed-in user |
| `PUT` | `/api/transactions/:id` | Update an owned transaction |
| `DELETE` | `/api/transactions/:id` | Delete an owned transaction |

Expense transactions require a category: `Food`, `Travel`, `Shopping`, `Bills`, `Other`, or `Rent`. Income transactions are stored under the `Income` category. The frontend proxies `/api` requests to this service in Vite development mode.

This application is intended for local use. Before deploying to a public network, use HTTPS and review operational security, backups, privacy, and applicable employment/payroll requirements.
