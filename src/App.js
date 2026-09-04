import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import AtmMachine from "./AtmMachine";
import "./App.css";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("login"); // 'login' or 'register'

  const handleLoginSuccess = (username) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView("login");
  };

  return (
    <div className="app-container">
      {!currentUser ? (
        currentView === "login" ? (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setCurrentView("register")}
          />
        ) : (
          <Register
            onRegisterSuccess={handleLoginSuccess}
            onSwitchToLogin={() => setCurrentView("login")}
          />
        )
      ) : (
        <AtmMachine username={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
