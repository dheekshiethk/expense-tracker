import { useEffect, useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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

const emptyDraft = {
  fullName: "",
  email: "",
  password: "",
  department: "",
  jobTitle: "",
  salary: "",
};

async function request(path, options = {}) {
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
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed with status ${response.status}.`);
  return result;
}

function EmployeeForm({ draft, editing, saving, onChange, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="expense-modal employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-form-title">
        <div className="modal-heading">
          <div>
            <span className="modal-kicker">{editing ? "EMPLOYEE DETAILS" : "NEW EMPLOYEE"}</span>
            <h2 id="employee-form-title">{editing ? "Update employee" : "Add an employee"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <form onSubmit={onSubmit}>
          <label className="field-label">Full name
            <input autoFocus required maxLength={100} value={draft.fullName} onChange={(event) => onChange("fullName", event.target.value)} />
          </label>
          <label className="field-label">Email address
            <input required type="email" maxLength={254} disabled={editing} value={draft.email} onChange={(event) => onChange("email", event.target.value)} />
          </label>
          <label className="field-label">{editing ? "New password (optional)" : "Password"}
            <input
              required={!editing}
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={200}
              placeholder={editing ? "Leave blank to keep current password" : "At least 12 characters"}
              value={draft.password}
              onChange={(event) => onChange("password", event.target.value)}
            />
          </label>
          <div className="form-row">
            <label className="field-label">Department / field
              <select value={draft.department} onChange={(event) => onChange("department", event.target.value)}>
                <option value="">Select department</option>
                {draft.department && !DEPARTMENT_OPTIONS.includes(draft.department) && <option value={draft.department}>{draft.department}</option>}
                {DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="field-label">Job title
              <select value={draft.jobTitle} onChange={(event) => onChange("jobTitle", event.target.value)}>
                <option value="">Select job title</option>
                {draft.jobTitle && !JOB_TITLE_OPTIONS.includes(draft.jobTitle) && <option value={draft.jobTitle}>{draft.jobTitle}</option>}
                {JOB_TITLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <label className="field-label">Salary (INR)
            <input type="number" min="0" step="0.01" placeholder="Optional" value={draft.salary} onChange={(event) => onChange("salary", event.target.value)} />
          </label>
          <p className="employee-form-note">{editing ? "Leave the password blank to keep it unchanged." : "The user will sign in with this email and password."}</p>
          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save employee" : "Create employee"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function OrganizationUsers({ onEmployeesChange }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  useEffect(() => {
    let active = true;
    request("/users")
      .then((loadedUsers) => {
        if (active) {
          setUsers(loadedUsers);
          onEmployeesChange(loadedUsers);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onEmployeesChange]);

  function startCreate() {
    setEditingUser(null);
    setDraft(emptyDraft);
    setShowForm(true);
    setTemporaryPassword("");
  }

  function startEdit(user) {
    setEditingUser(user);
    setDraft({
      fullName: user.fullName,
      email: user.email,
      password: "",
      department: user.department || "",
      jobTitle: user.jobTitle || "",
      salary: user.salary ?? "",
    });
    setShowForm(true);
    setTemporaryPassword("");
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        fullName: draft.fullName,
        email: draft.email.trim().toLowerCase(),
        department: draft.department,
        jobTitle: draft.jobTitle,
        salary: draft.salary === "" ? null : Number(draft.salary),
      };
      if (draft.password) body.password = draft.password;
      if (editingUser) {
        const updated = await request(`/users/${encodeURIComponent(editingUser.id)}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        const updatedUsers = users.map((user) => user.id === updated.id ? updated : user);
        setUsers(updatedUsers);
        onEmployeesChange(updatedUsers);
      } else {
        const result = await request("/users", { method: "POST", body: JSON.stringify(body) });
        const updatedUsers = [...users, result.user].sort((a, b) => a.fullName.localeCompare(b.fullName));
        setUsers(updatedUsers);
        onEmployeesChange(updatedUsers);
      }
      setShowForm(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateEmployee(user, action) {
    try {
      const updated = await request(`/users/${encodeURIComponent(user.id)}/${action}`, { method: "POST" });
      const updatedUsers = users.map((item) => item.id === updated.id ? updated : item);
      setUsers(updatedUsers);
      onEmployeesChange(updatedUsers);
      setError("");
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function approveUser(user) {
    await updateEmployee(user, "approve");
  }

  async function resetPassword(user) {
    try {
      const result = await request(`/users/${encodeURIComponent(user.id)}/reset-password`, { method: "POST" });
      const updatedUsers = users.map((item) => item.id === result.user.id ? result.user : item);
      setUsers(updatedUsers);
      onEmployeesChange(updatedUsers);
      setTemporaryPassword(result.temporaryPassword);
      setError("");
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  function deactivateUser(user) {
    if (!window.confirm(`Deactivate ${user.fullName}'s account? They will no longer be able to sign in.`)) return;
    updateEmployee(user, "deactivate");
  }

  function activateUser(user) {
    updateEmployee(user, "activate");
  }

  return (
    <section className="panel employee-management">
      <div className="panel-heading transaction-heading">
        <div><h2>Employee directory</h2><p>Manage employee accounts and organization details.</p></div>
        <button className="button-primary" onClick={startCreate}>Add employee</button>
      </div>
      {error && <div className="api-banner api-error" role="alert">{error}</div>}
      {temporaryPassword && (
        <div className="temporary-password" role="status">
          <div><strong>Temporary password</strong><span>Share this with the employee now. It is shown only once.</span></div>
          <code>{temporaryPassword}</code>
          <button type="button" className="button-secondary" onClick={() => setTemporaryPassword("")}>Dismiss</button>
        </div>
      )}
      {loading ? (
        <div className="api-banner" role="status">Loading employees…</div>
      ) : users.length ? (
        <div className="employee-list">
          {users.map((user) => (
            <article className="employee-card" key={user.id}>
              <div className="employee-card-heading">
                <div className="employee-avatar">{user.fullName.trim().charAt(0).toUpperCase()}</div>
                <div className="employee-identity"><strong>{user.fullName}</strong><span>{user.email}</span></div>
                <span className={`employee-status ${user.status}`}>{user.status}</span>
              </div>
              <dl className="employee-details">
                <div><dt>DEPARTMENT / FIELD</dt><dd>{user.department || "Not set"}</dd></div>
                <div><dt>JOB TITLE</dt><dd>{user.jobTitle || "Not set"}</dd></div>
                <div><dt>SALARY</dt><dd>{user.salary === null ? "Not set" : currency.format(user.salary)}</dd></div>
              </dl>
              <div className="employee-actions">
                {user.status === "pending" && <button className="button-primary" onClick={() => approveUser(user)}>Approve sign-up</button>}
                {user.status === "active" && <button className="button-secondary" onClick={() => resetPassword(user)}>Reset password</button>}
                <button className="button-secondary" onClick={() => startEdit(user)}>Edit details</button>
                {user.status === "active" && <button className="button-secondary" onClick={() => deactivateUser(user)}>Deactivate</button>}
                {user.status === "inactive" && <button className="button-secondary" onClick={() => activateUser(user)}>Reactivate</button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-transactions">
          <strong>No employees yet</strong>
          <span>Add an employee or approve a sign-up request to get started.</span>
        </div>
      )}
      {showForm && (
        <EmployeeForm
          draft={draft}
          editing={Boolean(editingUser)}
          saving={saving}
          onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
          onClose={() => setShowForm(false)}
          onSubmit={saveEmployee}
        />
      )}
    </section>
  );
}

export default OrganizationUsers;
