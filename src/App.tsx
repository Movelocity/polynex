import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { initializeSampleData } from '@/utils/sampleData';

// Pages
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { BlogDetail } from '@/pages/BlogDetail';
import { WriteBlog } from '@/pages/WriteBlog';
import { Dashboard } from '@/pages/Dashboard';
import { Search } from '@/pages/Search';
import { CategoryPage } from '@/pages/CategoryPage';
import { NotFound } from '@/pages/NotFound';

function App() {
  useEffect(() => {
    // 初始化示例数据
    initializeSampleData();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes without layout */}
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

          {/* Routes with layout */}
          <Route path="/" element={<Layout />}>
            {/* Public routes */}
            <Route index element={<Home />} />
            <Route path="blog/:id" element={<BlogDetail />} />
            <Route path="search" element={<Search />} />
            <Route path="category/:category" element={<CategoryPage />} />

            {/* Protected routes */}
            <Route 
              path="write" 
              element={
                <ProtectedRoute>
                  <WriteBlog />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="edit/:id" 
              element={
                <ProtectedRoute>
                  <WriteBlog />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
