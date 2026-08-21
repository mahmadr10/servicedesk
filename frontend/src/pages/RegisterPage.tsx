import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user, token } = await registerRequest({ name, email, password, role });
      login(user, token);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Create an account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        {/*
          Demo-scope decision: there's no Admin role to invite/create agent
          accounts (that's out of scope, per the spec), so we let people pick
          their role at signup. In a real product, agent accounts would be
          provisioned by an admin instead of self-selected.
        */}
        <label className="text-sm text-slate-600">
          I am a:
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="CUSTOMER">Customer</option>
            <option value="AGENT">Agent</option>
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
