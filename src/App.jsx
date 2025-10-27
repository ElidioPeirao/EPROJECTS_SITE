
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Tools from '@/pages/Tools';
import ToolViewer from '@/pages/ToolViewer';
import Budgets from '@/pages/Budgets';
import BudgetDetail from '@/pages/BudgetDetail';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/AdminPanel';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  const { currentUser, userStatus, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  if (userStatus === 'banned') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Acesso Bloqueado</h1>
            <p className="text-center">Sua conta foi banida. Entre em contato com o suporte para mais informações.</p>
        </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/" />} />
      
      <Route path="/tool/:toolId" element={
          <ProtectedRoute>
            <ToolViewer />
          </ProtectedRoute>
        } />
        
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tools" element={
          <ProtectedRoute>
            <Tools />
          </ProtectedRoute>
        } />
        <Route path="budgets" element={
          <ProtectedRoute>
            <Budgets />
          </ProtectedRoute>
        } />
        <Route path="budgets/:id" element={
          <ProtectedRoute>
            <BudgetDetail />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="courses" element={
          <ProtectedRoute requiredRole="E-MASTER">
            <Courses />
          </ProtectedRoute>
        } />
        <Route path="courses/:id" element={
          <ProtectedRoute requiredRole="E-MASTER">
            <CourseDetail />
          </ProtectedRoute>
        } />
        <Route path="admin" element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminPanel />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default App;
