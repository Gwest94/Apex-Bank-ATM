import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Login.css";

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", accountNumber.trim())
      .eq("pin", pin.trim())
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError(
        "❌ Invalid Account Number or PIN. Please check your credentials."
      );
    } else {
      onLoginSuccess(data.username);
    }
  };

  return (
    <div className="login-dashboard-container">
      <div className="login-glass-card">
        <div className="login-brand">
          <h2>
            APEX <span>BANK</span>
          </h2>
          <p>Secure Cloud ATM Portal</p>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleLogin} className="login-input-form">
          <div className="input-group">
            <label>Account Number</label>
            <input
 type="text"
  placeholder="10-Digit Account Number"
  maxLength="10"
  value={accountNumber}
  onChange={(e) => setAccountNumber(e.target.value)}
/>
          </div>

          <div className="input-group">
            <label>4-Digit PIN</label>
            <input
              type="password"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Verifying with Cloud..." : "Access Account"}
          </button>
        </form>

        <div
          className="login-credentials-hint"
          style={{ textAlign: "center", marginTop: "15px" }}
        >
          <span>
            New to Apex Bank?{" "}
            <button
              onClick={onSwitchToRegister}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                cursor: "pointer",
                textDecoration: "underline",
                font: "inherit",
              }}
            >
              Create an Account
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
