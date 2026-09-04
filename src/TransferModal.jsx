import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./AtmMachine.css"; // Reuse your styles

export default function TransferModal({ senderUsername, onTransferComplete, onClose }) {
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Live "Name Enquiry" effect as the user types the account number
  useEffect(() => {
    const fetchRecipientName = async () => {
      if (recipientAccount.trim().length < 5) {
        setRecipientName("");
        return;
      }

      setIsVerifying(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("name, username")
        .eq("username", recipientAccount.trim())
        .single();

      if (error || !data) {
        setRecipientName("❌ Account not found");
      } else if (data.username === senderUsername) {
        setRecipientName("❌ Cannot transfer to yourself");
      } else {
        setRecipientName(`✅ Verified: ${data.name}`);
      }
      setIsVerifying(false);
    };

    const timer = setTimeout(fetchRecipientName, 400); // Debounce lookup
    return () => clearTimeout(timer);
  }, [recipientAccount, senderUsername]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("⚠️ Please enter a valid transfer amount.");
      return;
    }

    if (pin.length !== 4) {
      setError("❌ Please enter your 4-digit PIN.");
      return;
    }

    if (!recipientName.startsWith("✅")) {
      setError("❌ Please enter a valid, verified recipient account number.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify sender's PIN and balance
      const { data: senderProfile, error: senderError } = await supabase
        .from("profiles")
        .select("balance, pin, name")
        .eq("username", senderUsername)
        .single();

      if (senderError || senderProfile.pin !== pin.trim()) {
        setError("❌ Incorrect 4-digit PIN.");
        setLoading(false);
        return;
      }

      if (senderProfile.balance < numAmount) {
        setError("❌ Insufficient funds for this transfer.");
        setLoading(false);
        return;
      }

      // 2. Get recipient's current balance
      const { data: recipientProfile, error: recError } = await supabase
        .from("profiles")
        .select("balance, name")
        .eq("username", recipientAccount.trim())
        .single();

      if (recError) {
        setError("❌ Recipient account error.");
        setLoading(false);
        return;
      }

      const newSenderBalance = senderProfile.balance - numAmount;
      const newRecipientBalance = recipientProfile.balance + numAmount;

      // 3. Update sender's balance
      await supabase
        .from("profiles")
        .update({ balance: newSenderBalance })
        .eq("username", senderUsername);

      // 4. Update recipient's balance
      await supabase
        .from("profiles")
        .update({ balance: newRecipientBalance })
        .eq("username", recipientAccount.trim());

      // 5. Log transaction for SENDER (e.g., "Transfer to Julian GreenBlatt")
      await supabase.from("transactions").insert([
        {
          username: senderUsername,
          type: `Transfer to ${recipientProfile.name}`,
          amount: numAmount,
        },
      ]);

      // 6. Log transaction for RECIPIENT using Sender's ACTUAL NAME
      await supabase.from("transactions").insert([
        {
          username: recipientAccount.trim(),
          type: `Transfer from ${senderProfile.name}`,
          amount: numAmount,
        },
      ]);

      setLoading(false);
      onTransferComplete();
    } catch (err) {
      console.error("Transfer error:", err);
      setError("❌ Transfer failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="login-glass-card" style={{ maxWidth: "450px", width: "100%" }}>
        <div className="login-brand">
          <h2>
            APEX <span>TRANSFER</span>
          </h2>
          <p>Send funds securely to another Apex account</p>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleTransfer} className="login-input-form">
          <div className="input-group">
            <label>Recipient Account Number</label>
            <input
              type="text"
              placeholder="10-Digit Account Number"
              maxLength="10"
              value={recipientAccount}
              onChange={(e) => setRecipientAccount(e.target.value)}
              required
            />
            {/* Live Name Enquiry Feedback Tag */}
            {recipientAccount && (
              <small
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontWeight: "bold",
                  color: recipientName.startsWith("✅") ? "#38bdf8" : "#f87171",
                }}
              >
                {isVerifying ? "Verifying account..." : recipientName}
              </small>
            )}
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <label>Transfer Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="input-group" style={{ marginTop: "12px" }}>
            <label>Confirm 4-Digit PIN</label>
            <input
              type="password"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Processing..." : "Send Money"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#334155",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}