import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./AtmMachine.css";
import TransferModal from "./TransferModal";

export default function AtmMachine({ username, onLogout }) {
  const [balance, setBalance] = useState(0.0);
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("deposit");
  const [message, setMessage] = useState("");

  // Bill payment specific states
  const [billCategory, setBillCategory] = useState("Airtime");
  const [provider, setProvider] = useState("MTN");
  const [targetNumber, setTargetNumber] = useState("");

  const [history, setHistory] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Fetch live balance, name, and transaction history from Supabase on load
  useEffect(() => {
    fetchUserData();
  }, [username]);

  const fetchUserData = async () => {
    if (!username) return;

    // 1. Fetch user balance and name from 'profiles'
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("balance, name")
      .eq("username", username)
      .single();

    if (profileError) {
      console.error("Error fetching profile data:", profileError.message);
    } else if (profileData) {
      setBalance(parseFloat(profileData.balance));
      setCustomerName(profileData.name || username); // Fallback to username if name is missing
    }

    // 2. Fetch transaction history from 'transactions'
    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("username", username)
      .order("id", { ascending: false });

    if (txError) {
      console.error("Error fetching transactions:", txError.message);
    } else if (txData) {
      setHistory(
        txData.map((tx) => ({
          type: tx.type,
          amount: parseFloat(tx.amount),
          date: new Date().toLocaleTimeString(),
        }))
      );
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage("⚠️ Please enter a valid amount greater than zero.");
      return;
    }

    let newBalance = balance;
    let txLabel = "";

    if (transactionType === "withdraw") {
      if (numAmount > balance) {
        setMessage("❌ Error: Insufficient funds for this withdrawal.");
        return;
      }
      newBalance = balance - numAmount;
      txLabel = "Withdrawal";
    } else if (transactionType === "deposit") {
      newBalance = balance + numAmount;
      txLabel = "Deposit";
    } else if (transactionType === "bills") {
      if (!targetNumber || targetNumber.length < 5) {
        setMessage("❌ Error: Please enter a valid phone number or meter/smartcard number.");
        return;
      }
      if (numAmount > balance) {
        setMessage("❌ Error: Insufficient funds for this bill payment.");
        return;
      }
      newBalance = balance - numAmount;
      txLabel = `${billCategory} (${provider})`;
    }

    // 1. Update balance in Supabase 'profiles' table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("username", username);

    if (updateError) {
      setMessage(`❌ Database Error: ${updateError.message}`);
      return;
    }

    // 2. Insert transaction record into Supabase 'transactions' table
    const { error: txInsertError } = await supabase
      .from("transactions")
      .insert([
        {
          username: username,
          type: txLabel,
          amount: numAmount,
        },
      ]);

    if (txInsertError) {
      console.error("Error logging transaction:", txInsertError.message);
    }

    // 3. Update local React states to match cloud database
    setBalance(newBalance);
    setHistory([
      {
        type: txLabel,
        amount: numAmount,
        date: new Date().toLocaleTimeString(),
      },
      ...history,
    ]);

    if (transactionType === "bills") {
      setMessage(
        `✅ Successfully paid $${numAmount.toFixed(2)} for ${billCategory} (${provider}) - Ref: ${targetNumber}.`
      );
      setTargetNumber("");
    } else {
      setMessage(
        `✅ Successfully ${
          transactionType === "deposit" ? "deposited" : "withdrew"
        } $${numAmount.toFixed(2)}.`
      );
    }

    setAmount("");
  };

  const handleQuickCash = (quickAmount) => {
    setTransactionType("withdraw");
    setAmount(quickAmount.toString());
  };

  return (
    <div className="atm-dashboard">
      <header className="atm-topbar">
        <div className="bank-brand">
          <h2>
            APEX <span>ATM</span>
          </h2>
        </div>
        <div className="user-profile-badge">
          <div className="avatar">{customerName ? customerName.charAt(0) : "U"}</div>
          <span>
            Welcome, <strong>{customerName || "Client"}</strong>
          </span>
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              background: "#38bdf8",
              color: "#0f172a",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              marginLeft: "8px",
              marginRight: "8px",
            }}
          >
            Transfer Funds
          </button>
          <button onClick={onLogout} className="logout-action-btn">
            Sign Out
          </button>
        </div>
      </header>

      <div className="atm-grid-layout">
        <div className="atm-main-card">
          <div className="balance-overview-card">
            <span className="balance-label">Available Balance</span>
            <h1 className="balance-amount">${balance.toFixed(2)}</h1>
          </div>

          {message && <div className="feedback-banner">{message}</div>}

          <form onSubmit={handleTransaction} className="transaction-form-panel">
            <div className="tab-selector three-tabs">
              <button
                type="button"
                className={`tab-btn ${
                  transactionType === "deposit" ? "active-deposit" : ""
                }`}
                onClick={() => setTransactionType("deposit")}
              >
                Deposit
              </button>
              <button
                type="button"
                className={`tab-btn ${
                  transactionType === "withdraw" ? "active-withdraw" : ""
                }`}
                onClick={() => setTransactionType("withdraw")}
              >
                Withdraw
              </button>
              <button
                type="button"
                className={`tab-btn ${
                  transactionType === "bills" ? "active-airtime" : ""
                }`}
                onClick={() => setTransactionType("bills")}
              >
                Pay Bills
              </button>
            </div>

            {transactionType === "bills" && (
              <div className="airtime-specific-fields">
                <div className="input-field-group">
                  <label>Select Bill Type</label>
                  <select
                    value={billCategory}
                    onChange={(e) => {
                      setBillCategory(e.target.value);
                      if (e.target.value === "Electricity") setProvider("IKEDC");
                      else if (e.target.value === "Data") setProvider("MTN Data");
                      else setProvider("MTN");
                    }}
                    className="network-select"
                  >
                    <option value="Airtime">Airtime</option>
                    <option value="Data">Data Bundle</option>
                    <option value="Electricity">Electricity</option>
                  </select>
                </div>

                <div className="input-field-group" style={{ marginTop: "10px" }}>
                  <label>Select Provider / Biller</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="network-select"
                  >
                    {billCategory === "Electricity" ? (
                      <>
                        <option value="IKEDC">IKEDC (Ikeja Electric)</option>
                        <option value="EKEDC">EKEDC (Eko Electric)</option>
                        <option value="PHED">PHED (Port Harcourt Electric)</option>
                      </>
                    ) : (
                      <>
                        <option value="MTN">MTN</option>
                        <option value="Airtel">Airtel</option>
                        <option value="Glo">Glo</option>
                        <option value="9mobile">9mobile</option>
                      </>
                    )}
                  </select>
                </div>

                <div
                  className="input-field-group"
                  style={{ marginTop: "10px" }}
                >
                  <label>{billCategory === "Electricity" ? "Meter Number" : "Phone Number"}</label>
                  <input
                    type="text"
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    placeholder={billCategory === "Electricity" ? "Enter meter number" : "e.g. 08012345678"}
                  />
                </div>
              </div>
            )}

            <div className="input-field-group" style={{ marginTop: "12px" }}>
              <label>Enter Amount ($)</label>
              <div className="currency-input-wrapper">
                <span>$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {transactionType === "withdraw" && (
              <div className="quick-cash-section">
                <small>Quick Cash Shortcuts:</small>
                <div className="quick-cash-grid">
                  <button type="button" onClick={() => handleQuickCash(20)}>
                    $20
                  </button>
                  <button type="button" onClick={() => handleQuickCash(50)}>
                    $50
                  </button>
                  <button type="button" onClick={() => handleQuickCash(100)}>
                    $100
                  </button>
                  <button type="button" onClick={() => handleQuickCash(500)}>
                    $500
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`submit-action-btn ${transactionType}`}
            >
              {transactionType === "bills"
                ? `Pay ${billCategory}`
                : `Proceed ${
                    transactionType.charAt(0).toUpperCase() +
                    transactionType.slice(1)
                  }`}
            </button>
          </form>
        </div>

        <div className="atm-history-card">
          <h3>Activity Stream</h3>
          <div className="history-list-scroll">
            {history.map((item, index) => {
              const isOut =
                item.type.toLowerCase().includes("withdraw") ||
                item.type.toLowerCase().includes("airtime") ||
                item.type.toLowerCase().includes("data") ||
                item.type.toLowerCase().includes("electricity") ||
                item.type.toLowerCase().includes("transfer");
              return (
                <div
                  key={index}
                  className={`history-item ${isOut ? "item-out" : "item-in"}`}
                >
                  <div className="history-info">
                    <span className="h-type">{item.type}</span>
                    <small className="h-date">{item.date}</small>
                  </div>
                  <span className="h-amount">
                    {isOut ? "-" : "+"}${item.amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showTransferModal && (
        <TransferModal
          senderUsername={username}
          onTransferComplete={() => {
            setShowTransferModal(false);
            fetchUserData();
          }}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </div>
  );
}