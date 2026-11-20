import { useEffect, useMemo, useState } from "react";
import OrganizationUsers from "./OrganizationUsers.jsx";
import "./App.css";

const CATEGORIES = [
  { name: "Food", color: "#e7a85b", mark: "F" },
  { name: "Travel", color: "#7589e8", mark: "T" },
  { name: "Shopping", color: "#d278a6", mark: "S" },
  { name: "Bills", color: "#4aa995", mark: "B" },
  { name: "Other", color: "#9b84d8", mark: "O" },
  { name: "Rent" , color: "#453dfd", mark: "R"},
];

const DEPARTMENT_OPTIONS = [
  "Administration",
  "Customer Support",
  "Engineering",
  "Finance",
  "Human Resources",
  "Information Technology",
  "Legal",
  "Marketing",
  "Operations",
  "Research and Development",
  "Sales",
];

const JOB_TITLE_OPTIONS = [
  "Administrator",
  "Analyst",
  "Accountant",
  "Developer",
  "Designer",
  "Engineer",
  "Executive",
  "HR Specialist",
  "Intern",
  "Manager",
  "Project Manager",
  "Sales Executive",
  "Support Specialist",
  "Team Lead",
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return value || "";

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the API. Check that the backend and MongoDB are running.");
  }

  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    if (response.status >= 500) {
      throw new Error("Cannot reach the API. Check that the backend and MongoDB are running.");
    }
    throw new Error("The API returned an invalid response. Please try again.");
  }
  if (!response.ok) {
    const error = new Error(result.error || `API request failed with status ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return result;
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    id: transaction._id || transaction.id,
    type: transaction.type || "expense",
  };
}

async function loadInitialData() {
  const [transactions, profile] = await Promise.all([
    apiRequest("/transactions"),
    apiRequest("/profile"),
  ]);
  return { transactions, profile };
}

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    overview: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    transactions: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    savings: <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" /><path d="M10 11v5m4-5v5" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [profile, setProfile] = useState({ fullName: "", email: "" });
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [accountMessage, setAccountMessage] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => dateInputValue());
  const [activeView, setActiveView] = useState("overview");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("expense");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [date, setDate] = useState(() => dateInputValue());

  useEffect(() => {
    let active = true;
    apiRequest("/auth/me")
      .then(async (user) => {
        if (!user) {
          return {
            user: null,
            profile: { fullName: "", email: "" },
            transactions: [],
            employees: [],
          };
        }
        if (user.mustChangePassword) {
          return { user, profile: user, transactions: [], employees: [] };
        }
        const data = await loadInitialData();
        const loadedEmployees = user.role === "admin" ? await apiRequest("/users") : [];
        return { user, ...data, employees: loadedEmployees };
      })
      .then((data) => {
        if (!active) return;
        if (!data.user) {
          setAuthUser(null);
          setProfile({ fullName: "", email: "" });
          setExpenses([]);
          setEmployees([]);
          return;
        }
        const currentUser = { ...data.user, ...data.profile };
        setAuthUser(currentUser);
        setProfile(data.profile);
        setExpenses(data.transactions.map(normalizeTransaction));
        setEmployees(data.employees);
        if (currentUser.mustChangePassword) setActiveView("wallet");
      })
      .catch((error) => {
        if (active && error.status !== 401) setApiError(error.message);
      })
      .finally(() => {
        if (active) {
          setAuthReady(true);
          setDataReady(true);
        }
      });
    return () => { active = false; };
  }, []);
  const selectedMonth = selectedDate.slice(0, 7);
  const selectedTransactions = useMemo(
    () => expenses.filter((expense) => expense.date === selectedDate),
    [expenses, selectedDate],
  );
  const selectedMonthTransactions = useMemo(
    () => expenses.filter((expense) => expense.date?.startsWith(selectedMonth)),
    [expenses, selectedMonth],
  );
  const selectedExpenses = selectedTransactions.filter((expense) => expense.type !== "income");
  const total = selectedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const selectedIncome = selectedTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const monthlyEmployeeSalaries = employees
    .filter((employee) => employee.status === "active")
    .reduce((sum, employee) => sum + Number(employee.salary || 0), 0);
  const employeesWithSalary = employees
    .filter((employee) => employee.status === "active" && employee.salary !== null && employee.salary !== undefined)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const dailySavings = selectedIncome - total;
  const savingsRate = selectedIncome ? (dailySavings / selectedIncome) * 100 : 0;
  const [year, monthNumber] = selectedDate.split("-").map(Number);
  const monthlyTotal = expenses
    .filter((expense) => expense.date?.startsWith(selectedMonth) && expense.type !== "income")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const monthlyMoneySpent = monthlyTotal + monthlyEmployeeSalaries;

  const visibleTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return selectedMonthTransactions
      .filter((transaction) => {
        if (categoryFilter === "All categories") return true;
        if (transaction.type === "income") return categoryFilter === "Income";
        return transaction.category === categoryFilter;
      })
      .filter((transaction) => !normalizedSearch || transaction.name.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  }, [selectedMonthTransactions, search, categoryFilter]);
  const recentTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return selectedTransactions
      .filter((transaction) => {
        if (categoryFilter === "All categories") return true;
        if (transaction.type === "income") return categoryFilter === "Income";
        return transaction.category === categoryFilter;
      })
      .filter((transaction) => !normalizedSearch || transaction.name.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  }, [selectedTransactions, search, categoryFilter]);
  const savingsByTransactionId = new Map();
  let runningSavings = 0;
  [...selectedMonthTransactions]
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))
    .forEach((transaction) => {
      const amountValue = Number(transaction.amount || 0);
      runningSavings += transaction.type === "income" ? amountValue : -amountValue;
      savingsByTransactionId.set(transaction.id, runningSavings);
    });

  const categoryTotals = CATEGORIES.map((item) => ({
    ...item,
    total: selectedExpenses
      .filter((expense) => expense.category === item.name)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
  }));
  const largestCategory = categoryTotals.reduce(
    (largest, item) => item.total > largest.total ? item : largest,
    { name: "—", total: 0 },
  );
  const chartMonths = Array.from({ length: 6 }, (_, index) => {
    const current = new Date(year, monthNumber - 1 - (5 - index), 1);
    const key = monthKey(current);
    const value = expenses
      .filter((expense) => expense.date?.startsWith(key))
      .filter((expense) => expense.type !== "income")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return { key, label: current.toLocaleDateString("en-IN", { month: "short" }), value };
  });
  const chartMaximum = Math.max(...chartMonths.map((item) => item.value), 1);
  const savingsMonths = chartMonths.map((item) => {
    const income = expenses
      .filter((transaction) => transaction.date?.startsWith(item.key) && transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    return { ...item, value: income - item.value };
  });
  const savingsMaximum = Math.max(...savingsMonths.map((item) => Math.abs(item.value)), 1);

  function startNewTransaction() {
    setEditingTransaction(null);
    setName("");
    setAmount("");
    setTransactionType("expense");
    setCategory(CATEGORIES[0].name);
    setDate(dateInputValue());
    setShowForm(true);
  }

  function startEditingTransaction(transaction) {
    setEditingTransaction(transaction);
    setName(transaction.name);
    setAmount(String(transaction.amount));
    setTransactionType(transaction.type);
    setCategory(transaction.type === "income" ? CATEGORIES[0].name : transaction.category || CATEGORIES[0].name);
    setDate(transaction.date);
    setShowForm(true);
  }

  function closeTransactionForm() {
    setShowForm(false);
    setEditingTransaction(null);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    try {
      const transactionData = {
        name: name.trim(),
        amount: parsedAmount,
        type: transactionType,
        category: transactionType === "income" ? "Income" : category,
        date,
      };
      const savedTransaction = await apiRequest(
        editingTransaction ? `/transactions/${encodeURIComponent(editingTransaction.id)}` : "/transactions",
        {
          method: editingTransaction ? "PUT" : "POST",
          body: JSON.stringify(transactionData),
        },
      );
      const transaction = normalizeTransaction(savedTransaction);
      const updatedExpenses = editingTransaction
        ? expenses.map((item) => item.id === transaction.id ? transaction : item)
        : [...expenses, transaction];
      setExpenses(updatedExpenses);
      setApiError("");
      setName("");
      setAmount("");
      setTransactionType("expense");
      setCategory(CATEGORIES[0].name);
      setDate(dateInputValue());
      closeTransactionForm();
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function deleteTransaction(id) {
    try {
      await apiRequest(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
      const updatedExpenses = expenses.filter((transaction) => transaction.id !== id);
      setExpenses(updatedExpenses);
      setApiError("");
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function saveProfile(nextProfile) {
    try {
      const savedProfile = await apiRequest("/profile", {
        method: "PUT",
        body: JSON.stringify(nextProfile),
      });
      setProfile(savedProfile);
      setAuthUser((current) => ({ ...current, ...savedProfile }));
      setApiError("");
      return true;
    } catch (error) {
      setApiError(error.message);
      return false;
    }
  }

  async function enterApp(user) {
    setAuthUser(user);
    setProfile(user);
    setSelectedRole(null);
    setShowCreateAccount(false);
    setAccountMessage("");
    setApiError("");
    setActiveView(user.mustChangePassword ? "wallet" : "overview");
    setDataReady(false);

    if (user.mustChangePassword) {
      setExpenses([]);
      setEmployees([]);
      setDataReady(true);
      return;
    }

    try {
      const data = await loadInitialData();
      const loadedEmployees = user.role === "admin" ? await apiRequest("/users") : [];
      const currentUser = { ...user, ...data.profile };
      setAuthUser(currentUser);
      setProfile(data.profile);
      setExpenses(data.transactions.map(normalizeTransaction));
      setEmployees(loadedEmployees);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setDataReady(true);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setAuthPending(true);
    setApiError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const user = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: selectedRole }),
      });
      await enterApp(user);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleAccountFormSubmit(event) {
    event.preventDefault();
    setAuthPending(true);
    setApiError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          department: formData.get("department"),
          jobTitle: formData.get("jobTitle"),
        }),
      });
      setAccountMessage(result.message);
      setShowCreateAccount(false);
      form.reset();
    } catch (error) {
      setApiError(error.message);
    } finally {
      setAuthPending(false);
    }
  }

  async function changePassword(currentPassword, newPassword) {
    try {
      const user = await apiRequest("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      await enterApp(user);
      return true;
    } catch (error) {
      setApiError(error.message);
      return false;
    }
  }

  async function logout() {
    let logoutError = "";
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      logoutError = error.message;
    }
    setAuthUser(null);
    setEmployees([]);
    setProfile({ fullName: "", email: "" });
    setExpenses([]);
    setSelectedRole(null);
    setShowCreateAccount(false);
    setActiveView("overview");
    setApiError(logoutError);
  }

  function exportTransactions() {
    const rows = [
      ["Name", "Type", "Category", "Date", "Amount (INR)"],
      ...visibleTransactions.map((transaction) => [
        transaction.name,
        transaction.type === "income" ? "Income" : "Expense",
        transaction.type === "income" ? "" : transaction.category,
        transaction.date,
        transaction.amount,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const selectedDateLabel = formatCalendarDate(selectedDate);
  const profileInitial = profile.fullName.trim().charAt(0).toUpperCase() || "Y";

  if (!authReady) {
    return <main className="auth-loading">Checking your organization account…</main>;
  }

  if (!authUser) {
    return (
      <main className="login-screen">
        <section className="login-story">
          <a className="login-brand" href="#" aria-label="Pennywise home">
            <span className="brand-mark">p.</span>
            <span>pennywise</span>
          </a>
          <div className="login-story-content">
            <span className="login-eyebrow">A FRESH LOOK AT YOUR FINANCES</span>
            <h1>Your money,<br />a little more <em>mindful.</em></h1>
            <p>Keep track of the little things. Feel good about the bigger picture.</p>
            <div className="login-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-coin">₹</div>
              <div className="art-card art-card-back"><span>MONTHLY SAVINGS</span><strong>Growing steadily</strong><i>↗</i></div>
              <div className="art-card art-card-front"><span>THIS MONTH</span><strong>Looking good</strong><div className="art-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
              <span className="art-star star-one">✳</span>
              <span className="art-star star-two">✦</span>
            </div>
          </div>
          <p className="login-caption">A calmer way to spend, save, and stay in the know.</p>
        </section>
        <section className="login-form-side">
          {!selectedRole ? (
            <div className="login-form-wrap">
              <span className="login-mobile-brand"><span className="brand-mark">p.</span> pennywise</span>
              <span className="login-form-kicker">WELCOME TO PENNYWISE</span>
              <h2>Organization expense tracker.</h2>
              <p className="login-form-intro">Select how you’d like to continue.</p>
              {apiError && <div className="api-banner api-error" role="alert">{apiError}</div>}
              <div className="role-options">
                <button
                  type="button"
                  className="role-option"
                  onClick={() => setSelectedRole("user")}
                >
                  <strong>User</strong>
                  <span>Continue to your personal expense tracker</span>
                  <span className="role-option-arrow" aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  className="role-option"
                  onClick={() => setSelectedRole("admin")}
                >
                  <strong>Admin</strong>
                  <span>Continue to admin sign in</span>
                  <span className="role-option-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="login-form-wrap">
              <span className="login-mobile-brand"><span className="brand-mark">p.</span> pennywise</span>
              <span className="login-form-kicker">{showCreateAccount ? "REQUEST AN EMPLOYEE ACCOUNT" : selectedRole === "admin" ? "ORGANIZATION ADMIN" : "EMPLOYEE SIGN IN"}</span>
              <h2>{showCreateAccount ? "Request an account." : selectedRole === "admin" ? "Admin sign in." : "Welcome back."}</h2>
              <p className="login-form-intro">{showCreateAccount ? "An administrator must approve your request before you can sign in." : selectedRole === "admin" ? "Sign in to manage employee accounts and profiles." : "Sign in to manage your personal expenses."}</p>
              {apiError && <div className="api-banner api-error" role="alert">{apiError}</div>}
              <form
                className="login-form"
                onSubmit={showCreateAccount
                  ? handleAccountFormSubmit
                  : handleLoginSubmit}
              >
                {showCreateAccount && (
                  <label className="login-field">Full name
                    <input type="text" name="name" autoComplete="name" placeholder="Your name" maxLength="100" required />
                  </label>
                )}
                {showCreateAccount && (
                  <>
                    <label className="login-field">Department / field
                      <select name="department" required>
                        <option value="">Select department</option>
                        {DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="login-field">Job title
                      <select name="jobTitle" required>
                        <option value="">Select job title</option>
                        {JOB_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                  </>
                )}
                <label className="login-field">Email address
                  <input type="email" name="email" autoComplete="username" placeholder="you@example.com" required />
                </label>
                <label className="login-field">Password
                  <input type="password" name="password" autoComplete={showCreateAccount ? "new-password" : "current-password"} placeholder={showCreateAccount ? "At least 12 characters" : "Enter your password"} minLength={showCreateAccount ? 12 : undefined} required />
                </label>
                <button type="submit" className="button-primary login-submit" disabled={authPending}>{authPending ? "Please wait…" : showCreateAccount ? "Request account" : selectedRole === "admin" ? "Admin sign in" : "Sign in"} <span>→</span></button>
              </form>
              {selectedRole === "admin" && <p className="login-demo-note"><span>ⓘ</span> Employee expense records are private and are not visible to admins.</p>}
              {showCreateAccount && <p className="login-demo-note"><span>ⓘ</span> Sign-up requests remain pending until an administrator approves them.</p>}
              {accountMessage && <p className="login-account-message" role="status">{accountMessage}</p>}
              {selectedRole === "user" && (
                <p className="login-mode-switch">
                  {showCreateAccount ? "Already have an account?" : "New to Pennywise?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAccount((current) => !current);
                      setAccountMessage("");
                    }}
                  >
                    {showCreateAccount ? "Sign in" : "Create an account"}
                  </button>
                </p>
              )}
              <p className="login-mode-switch">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setShowCreateAccount(false);
                    setAccountMessage("");
                  }}
                >
                  Change account type
                </button>
              </p>
            </div>
          )}
          <p className="login-legal">Pennywise · Made for mindful money moments</p>
        </section>
      </main>
    );
  }

  if (authUser.mustChangePassword) {
    return (
      <main className="auth-required-screen">
        <section className="auth-required-panel">
          <span className="login-form-kicker">SECURE YOUR ACCOUNT</span>
          <h1>Choose a new password</h1>
          <p>Your administrator gave you a temporary password. Change it before continuing.</p>
          <PasswordChangeForm onSubmit={changePassword} required />
          {apiError && <div className="api-banner api-error" role="alert">{apiError}</div>}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActiveView("overview")} aria-label="Pennywise home">
          <span className="brand-mark">p.</span>
          <span>pennywise</span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <button className={activeView === "overview" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("overview")}>
            <Icon name="overview" /> Overview
          </button>
          <button className={activeView === "transactions" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("transactions")}>
            <Icon name="transactions" /> Transactions
            <span className="nav-count">{selectedMonthTransactions.length}</span>
          </button>
          {authUser.role === "admin" && (
            <button className={activeView === "team" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("team")}>
              <Icon name="transactions" /> Employees
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-spark">✳</span>
            <p>A little more clarity, a little less money stress.</p>
          </div>
          <div className="profile">
            <button className="profile-wallet" onClick={() => setActiveView("wallet")} aria-label="Open your wallet">
              <div className="profile-avatar">{profileInitial}</div>
              <div><strong>{profile.fullName || "Your wallet"}</strong><span>{profile.email || "Personal account"}</span></div>
            </button>
            <button className="logout-button" onClick={logout} aria-label="Log out" title="Log out"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activeView === "overview" ? "Overview" : activeView === "transactions" ? "Transactions" : activeView === "savings" ? "Savings" : activeView === "team" ? "Employees" : "Your wallet"}</strong></div>
          <div className="topbar-right">
            <span className="today-label"><Icon name="calendar" size={16} /> {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
            <button className="avatar-small" onClick={() => setActiveView("wallet")} aria-label="Open your wallet profile">{profileInitial}</button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{activeView === "overview" ? "YOUR MONEY, AT A GLANCE" : activeView === "transactions" ? authUser.role === "admin" ? "ORGANIZATION FINANCES" : "YOUR SPENDING HISTORY" : activeView === "savings" ? "INCOME MINUS SPENDING" : activeView === "team" ? "ORGANIZATION DIRECTORY" : "PERSONAL ACCOUNT"}</p>
              <h1>{activeView === "overview" ? "Good things are adding up." : activeView === "transactions" ? "Transactions" : activeView === "savings" ? "Savings" : activeView === "team" ? "Employees" : "Your wallet"}</h1>
              <p className="page-subtitle">{activeView === "overview" ? "Here’s how your spending is looking on this date." : activeView === "transactions" ? authUser.role === "admin" ? "Review employee salary details and your own transactions." : "Every little thing you’ve spent, all in one place." : activeView === "savings" ? "See what’s left for this date." : activeView === "team" ? "Manage employee accounts, departments, job titles, and salaries." : "View and update your organization profile."}</p>
            </div>
            <div className="heading-actions">
              {activeView !== "team" && (
                <>
                  <label className="date-picker">
                    <Icon name="calendar" size={17} />
                    <input aria-label="Select date" type="date" value={selectedDate} onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value); }} />
                  </label>
                  <button className="button-primary" onClick={startNewTransaction} disabled={!dataReady}><Icon name="plus" size={18} /> Add transaction</button>
                </>
              )}
            </div>
          </section>

          {!dataReady && <div className="api-banner" role="status">Connecting to the expense database…</div>}
          {apiError && <div className="api-banner api-error" role="alert">{apiError}</div>}

          {activeView === "wallet" || activeView === "team" ? null : activeView === "savings" ? (
            <section className="stats-grid savings-stats" aria-label="Selected date savings summary">
              <article className="stat-card">
                <div className="stat-top"><span className="stat-label">Income</span><span className="stat-icon mint-icon">↙</span></div>
                <strong className="stat-value">{currency.format(selectedIncome)}</strong>
                <span className="stat-foot">recorded on <b>{selectedDateLabel}</b></span>
              </article>
              <article className="stat-card">
                <div className="stat-top"><span className="stat-label">Expenses</span><span className="stat-icon peach-icon">↗</span></div>
                <strong className="stat-value">{currency.format(total)}</strong>
                <span className="stat-foot">spent on <b>{selectedDateLabel}</b></span>
              </article>
              <article className={`stat-card ${dailySavings >= 0 ? "featured-stat" : "negative-stat"}`}>
                <div className="stat-top"><span className="stat-label">Net savings</span><span className="stat-icon mint-icon">₹</span></div>
                <strong className="stat-value">{currency.format(dailySavings)}</strong>
                <span className="stat-foot">income minus expenses on {selectedDateLabel}</span>
              </article>
              <article className="stat-card">
                <div className="stat-top"><span className="stat-label">Savings rate</span><span className="stat-icon blue-icon">%</span></div>
                <strong className="stat-value">{selectedIncome ? `${savingsRate.toFixed(1)}%` : "—"}</strong>
                <span className="stat-foot">of recorded income saved</span>
              </article>
            </section>
          ) : (
            <section className="stats-grid" aria-label="Spending summary">
              <article className="stat-card featured-stat">
                <div className="stat-top"><span className="stat-label">{authUser.role === "admin" ? "Money spent" : "Total spent"}</span><span className="stat-icon mint-icon">↗</span></div>
                <strong className="stat-value">{currency.format(authUser.role === "admin" ? monthlyMoneySpent : monthlyTotal)}</strong>
                <span className="stat-foot">
                  {authUser.role === "admin"
                    ? <>Active employee salaries + your expenses for <b>{monthLabel}</b></>
                    : <>Expenses for <b>{monthLabel}</b></>}
                </span>
              </article>
              <article className="stat-card">
                <div className="stat-top"><span className="stat-label">Transactions</span><span className="stat-icon lilac-icon"><Icon name="transactions" size={17} /></span></div>
                <strong className="stat-value">{selectedTransactions.length}</strong>
                <span className="stat-foot">on <b>{selectedDateLabel}</b></span>
              </article>
              <article className="stat-card">
                <div className="stat-top"><span className="stat-label">{authUser.role === "admin" ? "Employee salaries" : "Monthly salary"}</span><span className="stat-icon peach-icon">↙</span></div>
                <strong className="stat-value">{currency.format(authUser.role === "admin" ? monthlyEmployeeSalaries : Number(authUser.salary || 0))}</strong>
                <span className="stat-foot">{authUser.role === "admin" ? "Total monthly salary for active employees" : "Set by your administrator"}</span>
              </article>
              <article className="stat-card">
                <div className="stat-top"><span className="stat-label">Top category</span><span className="stat-icon blue-icon">✳</span></div>
                <strong className="stat-value category-stat">{largestCategory.name}</strong>
                <span className="stat-foot">{largestCategory.total ? `${currency.format(largestCategory.total)} on ${selectedDateLabel}` : "Will show up as you spend"}</span>
              </article>
            </section>
          )}

          {activeView === "wallet" ? (
            <WalletProfile profile={profile} onSave={saveProfile} onChangePassword={changePassword} />
          ) : activeView === "team" ? (
            <OrganizationUsers onEmployeesChange={setEmployees} />
          ) : activeView === "overview" ? (
            <div className="dashboard-grid">
              <section className="panel spending-panel">
                <div className="panel-heading">
                  <div><h2>Spending overview</h2><p>Your last six months, in perspective</p></div>
                  <span className="panel-period">{monthLabel}</span>
                </div>
                <div className="chart-area" role="img" aria-label={`Monthly spending over the last six months: ${chartMonths.map((item) => `${item.label} ${currency.format(item.value)}`).join(", ")}`}>
                  <div className="chart-y-labels"><span>{currency.format(chartMaximum)}</span><span>{currency.format(chartMaximum / 2)}</span><span>₹0</span></div>
                  <div className="chart-bars">
                    {[0, 1, 2].map((line) => <div key={line} className={`chart-gridline line-${line}`} />)}
                    {chartMonths.map((item) => (
                      <div className="chart-column" key={item.key}>
                        <div className="bar-space">
                          <span className="chart-tooltip">{currency.format(item.value)}</span>
                          <div className={`month-bar ${item.key === selectedMonth ? "current-bar" : ""}`} style={{ height: `${item.value ? Math.max((item.value / chartMaximum) * 100, 4) : 2}%` }} />
                        </div>
                        <span className="month-label">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel category-panel">
                <div className="panel-heading">
                  <div><h2>Where it goes</h2><p>Spending by category</p></div>
                  <span className="category-total">{currency.format(total)}</span>
                </div>
                {total ? (
                  <div className="category-list">
                    {categoryTotals.filter((item) => item.total > 0).sort((a, b) => b.total - a.total).map((item) => (
                      <div className="category-row" key={item.name}>
                        <span className="category-mark" style={{ "--category-color": item.color }}>{item.mark}</span>
                        <div className="category-info">
                          <div className="category-line"><strong>{item.name}</strong><span>{currency.format(item.total)}</span></div>
                          <div className="progress-track"><div className="progress-fill" style={{ width: `${(item.total / total) * 100}%`, background: item.color }} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-chart"><div className="empty-illustration">✳</div><strong>No spending to break down yet</strong><span>Add an expense and your categories will appear here.</span></div>
                )}
              </section>

              <section className="panel transactions-panel" id="recent-transactions">
                <div className="panel-heading transaction-heading">
                  <div><h2>Recent transactions</h2><p>Transactions on {selectedDateLabel}</p></div>
                  <button className="text-button" onClick={() => setActiveView("transactions")}>See all <Icon name="arrow" size={15} /></button>
                </div>
                <TransactionList transactions={recentTransactions.slice(0, 5)} onEdit={startEditingTransaction} onDelete={deleteTransaction} />
              </section>
            </div>
          ) : activeView === "transactions" ? (
            <>
              {authUser.role === "admin" && (
                <section className="panel full-transactions">
                  <div className="panel-heading transaction-heading">
                    <div><h2>Active employee salaries</h2><p>Monthly salaries entered for active employees; these are not payment records.</p></div>
                  </div>
                  {employeesWithSalary.length ? (
                    <div className="transaction-list">
                      {employeesWithSalary.map((employee) => (
                        <article className="transaction-row" key={employee.id}>
                          <span className="salary-mark" aria-hidden="true">₹</span>
                          <div className="transaction-name">
                            <strong>{employee.fullName}</strong>
                            <span>{employee.department || "Department not set"}</span>
                          </div>
                          <strong className="transaction-amount">{currency.format(Number(employee.salary))}</strong>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-transactions">
                      <strong>No active employee salaries entered</strong>
                      <span>Enter salaries for active employees in the Employees section to see them here.</span>
                    </div>
                  )}
                </section>
              )}
              <section className="panel full-transactions">
                <div className="panel-heading transaction-heading">
                  <div><h2>{authUser.role === "admin" ? "Your transactions" : "All transactions"}</h2><p>{visibleTransactions.length} {visibleTransactions.length === 1 ? "transaction" : "transactions"} in {monthLabel}</p></div>
                  <button className="button-secondary" onClick={exportTransactions} disabled={!visibleTransactions.length}><Icon name="download" size={16} /> Export CSV</button>
                </div>
                <div className="table-controls">
                  <label className="search-box"><Icon name="search" size={17} /><input placeholder="Search transactions..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                  <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option>All categories</option>
                    <option>Income</option>
                    {CATEGORIES.map((item) => <option key={item.name}>{item.name}</option>)}
                  </select>
                </div>
                <TransactionList
                  transactions={visibleTransactions}
                  savingsByTransactionId={savingsByTransactionId}
                  showSavings
                  onEdit={startEditingTransaction}
                  onDelete={deleteTransaction}
                />
              </section>
            </>
          ) : (
            <section className="panel savings-panel">
              <div className="panel-heading transaction-heading">
                <div><h2>Monthly savings</h2><p>Income minus expenses for each month</p></div>
                <span className="panel-period">{monthLabel}</span>
              </div>
              <div className="savings-chart-list">
                {savingsMonths.map((item) => (
                  <div className="savings-month-row" key={item.key}>
                    <span className="savings-month-label">{item.label}</span>
                    <div className="savings-track">
                      <div className={`savings-fill ${item.value < 0 ? "below-zero" : ""}`} style={{ width: `${Math.max((Math.abs(item.value) / savingsMaximum) * 100, item.value ? 2 : 0)}%` }} />
                    </div>
                    <strong className={item.value < 0 ? "savings-negative" : "savings-positive"}>{currency.format(item.value)}</strong>
                  </div>
                ))}
              </div>
              <p className="savings-explainer">Savings are calculated as income minus expenses, starting at zero for each month. Add income transactions to see your savings.</p>
            </section>
          )}
          <footer className="page-footer"><span>Small steps make a big difference.</span><span>All amounts in Indian Rupees · Saved to MongoDB</span></footer>
        </div>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTransactionForm(); }}>
          <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><span className="modal-kicker">{editingTransaction ? "EDIT TRANSACTION" : "NEW TRANSACTION"}</span><h2 id="modal-title">{editingTransaction ? "Edit transaction" : "Add a transaction"}</h2></div>
              <button className="icon-button" onClick={closeTransactionForm} aria-label="Close dialog"><Icon name="close" /></button>
            </div>
            <form onSubmit={saveTransaction}>
              <label className="field-label">Description
                <input autoFocus required maxLength={80} placeholder={transactionType === "income" ? "e.g. Monthly salary" : "e.g. Coffee with friends"} value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field-label">Amount
                <div className="amount-input"><span>₹</span><input required type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
              </label>
              <div className="form-row">
                <label className="field-label">Type
                  <select value={transactionType} onChange={(event) => setTransactionType(event.target.value)}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
                {transactionType === "expense" && (
                  <label className="field-label">Category
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                      {CATEGORIES.map((item) => <option key={item.name}>{item.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div className="form-row">
                <label className="field-label">Date
                  <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
              </div>
              <div className="modal-actions"><button type="button" className="button-secondary" onClick={closeTransactionForm}>Cancel</button><button type="submit" className="button-primary">{editingTransaction ? "Save changes" : <><Icon name="plus" size={17} /> Save transaction</>}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function WalletProfile({ profile, onSave, onChangePassword }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  function startEditing() {
    setDraft(profile);
    setEditing(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const saved = await onSave({
      fullName: draft.fullName.trim(),
      department: draft.department.trim(),
      jobTitle: draft.jobTitle.trim(),
    });
    if (saved) setEditing(false);
  }

  return (
    <div className="wallet-profile-layout">
      <section className="panel wallet-profile-panel">
        <div className="wallet-profile-heading">
          <div className="wallet-profile-avatar">{profile.fullName.trim().charAt(0).toUpperCase() || "Y"}</div>
          <div>
            <h2>Organization profile</h2>
            <p>{profile.role === "admin" ? "Administrator" : "Employee"} · {profile.email}</p>
          </div>
          {!editing && <button className="button-secondary" onClick={startEditing}>Edit details</button>}
        </div>
        {editing ? (
          <form className="wallet-profile-form" onSubmit={saveProfile}>
            <label className="field-label">Full name
              <input autoFocus required maxLength={100} placeholder="Enter your full name" value={draft.fullName} onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="field-label">Department / field
              <select value={draft.department || ""} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))}>
                <option value="">Select department</option>
                {draft.department && !DEPARTMENT_OPTIONS.includes(draft.department) && <option value={draft.department}>{draft.department}</option>}
                {DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="field-label">Job title
              <select value={draft.jobTitle || ""} onChange={(event) => setDraft((current) => ({ ...current, jobTitle: event.target.value }))}>
                <option value="">Select job title</option>
                {draft.jobTitle && !JOB_TITLE_OPTIONS.includes(draft.jobTitle) && <option value={draft.jobTitle}>{draft.jobTitle}</option>}
                {JOB_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <div className="wallet-profile-actions">
              <button type="button" className="button-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="button-primary">Save details</button>
            </div>
          </form>
        ) : (
          <dl className="wallet-details">
            <div><dt>FULL NAME</dt><dd>{profile.fullName}</dd></div>
            <div><dt>EMAIL ADDRESS</dt><dd>{profile.email}</dd></div>
            <div><dt>DEPARTMENT / FIELD</dt><dd>{profile.department || <span className="missing-detail">Not set</span>}</dd></div>
            <div><dt>JOB TITLE</dt><dd>{profile.jobTitle || <span className="missing-detail">Not set</span>}</dd></div>
            <div><dt>SALARY</dt><dd>{profile.salary == null ? <span className="missing-detail">Not set</span> : currency.format(profile.salary)}</dd></div>
          </dl>
        )}
        <p className="wallet-privacy-note">You and your administrators can view your salary. Only administrators can change it. Your expense records are private to your account.</p>
      </section>
      {profile.role !== "user" && <PasswordChangeForm onSubmit={onChangePassword} />}
    </div>
  );
}

function PasswordChangeForm({ onSubmit, required = false }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    if (newPassword !== formData.get("confirmPassword")) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    const saved = await onSubmit(currentPassword, newPassword);
    if (!saved) setError("Could not change your password. Check the current password and try again.");
    setSaving(false);
    if (saved) form.reset();
  }

  return (
    <section className="panel password-panel">
      <div className="panel-heading">
        <div><h2>{required ? "Set a new password" : "Change password"}</h2><p>{required ? "Set a new password to activate your account." : "Use at least 12 characters."}</p></div>
      </div>
      <form className="wallet-profile-form" onSubmit={changePassword}>
        <label className="field-label">Current password
          <input required type="password" name="currentPassword" autoComplete="current-password" />
        </label>
        <label className="field-label">New password
          <input required type="password" name="newPassword" autoComplete="new-password" minLength={12} maxLength={200} />
        </label>
        <label className="field-label">Confirm new password
          <input required type="password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={200} />
        </label>
        {error && <div className="api-banner api-error" role="alert">{error}</div>}
        <div className="wallet-profile-actions">
          <button type="submit" className="button-primary" disabled={saving}>{saving ? "Saving…" : "Update password"}</button>
        </div>
      </form>
    </section>
  );
}

function TransactionList({ transactions, savingsByTransactionId = new Map(), showSavings = false, onEdit, onDelete }) {
  if (!transactions.length) {
    return (
      <div className="empty-transactions">
        <div className="empty-wallet">₹</div>
        <strong>No transactions here yet</strong>
        <span>Your transactions will show up here once you add one.</span>
      </div>
    );
  }

  return (
    <div className="transaction-table-wrap">
      {showSavings && (
        <div className="transaction-table-head">
          <span aria-hidden="true" />
          <span>Transaction</span>
          <span>Amount</span>
          <span title="Month-to-date income minus expenses after this transaction">Savings balance</span>
          <span aria-hidden="true" />
        </div>
      )}
      <div className={`transaction-list ${showSavings ? "with-savings" : ""}`}>
      {transactions.map((transaction) => {
        const isIncome = transaction.type === "income";
        const categoryInfo = CATEGORIES.find((item) => item.name === transaction.category) || CATEGORIES[4];
        return (
          <article className={`transaction-row ${showSavings ? "with-savings" : ""}`} key={transaction.id}>
            <span className={`transaction-mark ${isIncome ? "income-mark" : ""}`} style={{ "--category-color": isIncome ? "#4aa995" : categoryInfo.color }}>{isIncome ? "+" : categoryInfo.mark}</span>
            <div className="transaction-name"><strong>{transaction.name}</strong><span>{isIncome ? "Income" : transaction.category} <i>·</i> {formatCalendarDate(transaction.date)}</span></div>
            <strong className={`transaction-amount ${isIncome ? "income-amount" : ""}`}>{isIncome ? "+" : "−"}{currency.format(Number(transaction.amount))}</strong>
            {showSavings && <strong className={`transaction-savings ${savingsByTransactionId.get(transaction.id) < 0 ? "savings-negative" : ""}`}>{currency.format(savingsByTransactionId.get(transaction.id) || 0)}</strong>}
            <div className="transaction-actions">
              <button type="button" className="edit-button" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.name}`} title="Edit transaction"><Icon name="edit" size={16} /></button>
              <button type="button" className="delete-button" onClick={() => onDelete(transaction.id)} aria-label={`Delete ${transaction.name}`} title="Delete transaction"><Icon name="trash" size={16} /></button>
            </div>
          </article>
        );
      })}
      </div>
    </div>
  );
}

export default App;
