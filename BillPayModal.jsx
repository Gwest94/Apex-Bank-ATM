import React, { useState } from "react";
import { supabase } from "./supabaseClient";


export default function BillPayModal({ currentUser, onClose, onTransactionSuccess }) {
  const [biller, setBiller] = useState("Electricity");
  const [amount, setAmount] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Insert bill payment into your transactions table
      const { error: txError } = await supabase
        .from("transactions")
        .insert([
          { 
            username: currentUser, 
            type: `Bill Payment - ${biller}`, 
            amount: parseFloat(amount),
            details: `Ref: ${meterNumber}`
          }
        ]);

      if (txError) throw txError;

      onTransactionSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Pay Bills</h3>
        {error && <p className="error-text">{error}</p>}
        <form onSubmit={handlePayment}>
          <label>Select Biller:</label>
          value={biller} onChange={(e) => setBiller(e.target.value)}>
            <option value="Electricity">Electricity (IKEDC/PHED)</option>
            <option value="Airtime">Airtime / Data</option>
            <option value="CableTV">Cable TV (DSTV/GOtv)</option>
          
          <label>Smartcard / Meter Number:</label>
          <input 
            type="text" 
            value={meterNumber} 
            onChange={(e) => setMeterNumber(e.target.value)} 
            placeholder="Enter number" 
            required 
          />

          <label>Amount (NGN):</label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="0.00" 
            required 
          />

          <div className="modal-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Pay Now"}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}