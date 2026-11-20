# Pennywise expense tracker

React + Vite frontend for the Express/MongoDB API in `../expense-tracker-api`.

## Run locally

1. Make sure MongoDB is running locally.
2. In a terminal, start the API:

   ```powershell
   Set-Location ..\expense-tracker-api
   npm install
   npm run dev
   ```

3. In a second terminal, start the frontend:

   ```powershell
   Set-Location ..\expense-tracker-ui
   npm install
   npm run dev
   ```

Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` requests to `http://127.0.0.1:5000`. The API uses the local MongoDB database `expense_tracker` by default; see the backend `.env.example` to configure another connection.

The app starts with a User or Admin sign-in choice. Admins can add employees, manage department/job title and salary, and approve employee sign-ups. Employees can view their own expenses and salary; admins cannot view employee expense records. Real authentication and employee-owned transactions are enabled. See the API README to configure the first administrator before starting the backend.

Existing browser-stored transactions and the legacy wallet name are imported into the initial administrator's account when that administrator signs in.
