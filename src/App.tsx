import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Users from './components/Users/Users';
import Clients from './components/Clients/Clients';
import styles from './App.module.css';
import Incidents from './components/Incidents/Incidents';
import Assistance from './components/Assistance/Assistance';
import Pending from './components/Pending/Pending';
import Register from './components/Register/Register';

const BackButton: React.FC = () => {
  const location = useLocation();
  if (location.pathname === '/dashboard' || location.pathname === '/') {
    return null;
  }
  return (
    <Link to="/dashboard" className={styles.backButton}>
      ← Volver al Dashboard
    </Link>
  );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<string>('light');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <Router>
      <div className={styles.app}>
        <button onClick={toggleTheme} className={styles.themeButton}>
          {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
        </button>
        <BackButton />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/pending-tasks" element={<Pending />} />
          <Route path="/assistances" element={<Assistance />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;