import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Login.css"; 

export default function Register({ onSwitchToLogin, onRegisterSuccess }) {
  const [accountNumber, setAccountNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [initialBalance, setInitialBalance] = useState("1500");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("❌ PIN must be exactly 4 digits.");
      return;
    }

    if (!fullName.trim()) {
      setError("❌ Please enter your full name.");
      return;
    }

    setLoading(true);

    // 1. Check if the username already exists in Supabase
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", accountNumber.trim())
      .single();

    if (existingUser) {
      setLoading(false);
      setError("❌ Account number / username already exists. Try another.");
      return;
    }

    // 2. Insert new user profile into Supabase 'profiles' table including the name
    const { error: insertError } = await supabase.from("profiles").insert([
      {
        username: accountNumber.trim(),
        name: fullName.trim(),
        pin: pin.trim(),
        balance: parseFloat(initialBalance) || 1500.0,
      },
    ]);

    if (insertError) {
      setLoading(false);
      setError(`❌ Error creating account: ${insertError.message}`);
      return;
    }

    // 3. Log initial deposit into 'transactions' table
    await supabase.from("transactions").insert([
      {
        username: accountNumber.trim(),
        type: "Initial Deposit",
        amount: parseFloat(initialBalance) || 1500.0,
      },
    ]);

    setLoading(false);
    onRegisterSuccess(accountNumber.trim());
  };

  return (
    <div className="login-dashboard-container">
      <div className="login-glass-card">
        <div className="login-brand">
          <h2>
            APEX <span>BANK</span>
          </h2>
          <p>Create New Account</p>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleRegister} className="login-input-form">
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Julian GreenBlatt"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <label>Choose Account Number / Username</label>
            <input
              type="text"
              placeholder="10-Digit Account Number"
              maxLength="10"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <label>Create 4-Digit PIN</label>
            <input
              type="password"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
            />
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <label>Starting Deposit ($)</label>
            <input
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="1500.00"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Register Account"}
          </button>
        </form>

        <div
          className="login-credentials-hint"
          style={{ textAlign: "center", marginTop: "15px" }}
        >
          <span>
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                cursor: "pointer",
                textDecoration: "underline",
                font: "inherit",
              }}
            >
              Sign In here
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}