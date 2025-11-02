import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Users from './pages/Users'
import UserDetails from './pages/UserDetails'
import { useAuth } from './context/AuthContext'
import Nav from './components/Nav'
import Profile from "./pages/Profile";
import TaskList from './pages/TaskList'
import TaskDetails from './pages/TaskDetails'
import Register from './pages/Register'

function PrivateRoute({ children, roles }) {
  const auth = useAuth();
  if (!auth) return null;

  const { user } = auth;
  if (!user) return <Navigate to="/login" />;

  // 🔧 FIX HERE
  const roleName = user.role?.name || user.role;
  if (roles && !roles.includes(roleName)) {
    return <div className="p-4">Access denied</div>;
  }

  return children;
}


export default function App(){
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute roles={['admin','manager']}><Users /></PrivateRoute>} />
          <Route path="/users/:id" element={<PrivateRoute><UserDetails /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><TaskList /></PrivateRoute>} />
          <Route path="/tasks/:id" element={<PrivateRoute><TaskDetails /></PrivateRoute>} />
        </Routes>
      </div>
    </div>
  )
}
