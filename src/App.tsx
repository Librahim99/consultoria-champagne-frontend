import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Users from './components/Users/Users';
import Clients from './components/Clients/Clients';
import Incidents from './components/Incidents/Incidents';
import Assistance from './components/Assistance/Assistance';
import Pending from './components/Pending/Pending';
import Register from './components/Register/Register';
import AdminBot from './components/AdminBot/AdminBot';
import Layout from './components/Layout/Layout';
import { UserContextProvider } from './contexts/UserContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import styles from './App.module.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const App: React.FC = () => {
  if (!googleClientId) {
    console.warn('Google Client ID not found. Google OAuth features will be disabled.');
  }

  return (
    <>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <AppContent />
        </GoogleOAuthProvider>
      ) : (
        <AppContent />
      )}
    </>
  );
};

const AppContent: React.FC = () => {
  return (
    <UserContextProvider>
      <ThemeContextProvider>
        <Router>
          <div className={styles.app}>
            <ToastContainer position="top-right" autoClose={2000} />
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/pending-tasks" element={<Pending />} />
                <Route path="/assistances" element={<Assistance />} />
                <Route path="/admin/bot" element={<AdminBot />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </ThemeContextProvider>
    </UserContextProvider>
  );
};
      <UserContextProvider>
        <ThemeContextProvider>
          <Router>
            <div className={styles.app}>
              <ToastContainer position="top-right" autoClose={2000} />
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/pending-tasks" element={<Pending />} />
                  <Route path="/assistances" element={<Assistance />} />
                  <Route path="/admin/bot" element={<AdminBot />} />
                </Route>
              </Routes>
            </div>
          </Router>
        </ThemeContextProvider>
      </UserContextProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
