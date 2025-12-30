import React, { useState, useEffect } from 'react'
import './App.css'
import HabitTracker2026 from './components/HabitTracker2026'
import Login from './components/Login'

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('authUser') || '';
  });

  useEffect(() => {
    if (currentUser) localStorage.setItem('authUser', currentUser);
    else localStorage.removeItem('authUser');
  }, [currentUser]);

  const handleLogin = (username) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    setCurrentUser('');
  };

  return (
    <>
      {currentUser ? (
        <HabitTracker2026 user={currentUser} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  )
}

export default App
