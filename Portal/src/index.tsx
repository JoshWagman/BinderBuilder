import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './web_page';
import Collection from './collection';
import Login from './Login';
import Register from './Register';
import { AuthProvider } from './authContext';
import ProtectedRoute from './ProtectedRoute';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route 
            path="/collection" 
            element={
              <ProtectedRoute requireAuth={true}>
                <Collection />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <ProtectedRoute requireAuth={false}>
                <Login />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <ProtectedRoute requireAuth={false}>
                <Register />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  </React.StrictMode>
); 