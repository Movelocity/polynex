import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Pages
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { BlogDetail } from '@/pages/BlogDetail';
import { WriteBlog } from '@/pages/WriteBlog';
import { Dashboard } from '@/pages/Dashboard';
import { Search } from '@/pages/Search';
import { CategoryPage } from '@/pages/CategoryPage';
import { ArticleList } from '@/pages/ArticleList';
import { UserSettings } from '@/pages/UserSettings';
import { Tools } from '@/pages/Tools';
import { ImageCropper } from '@/pages/ImageCropper';
import { ImageOCR } from '@/pages/ImageOCR';
import { JsonFormatter } from '@/pages/JsonFormatter';
import { NotFound } from '@/pages/NotFound';
import { ServiceDemo } from '@/components/ServiceDemo';

function App() {

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

          <Route path="/service-demo" element={<ServiceDemo />} />

          {/* Routes with layout */}
          <Route path="/" element={<Layout />}>
            {/* Public routes */}
            <Route index element={<Home />} />
            <Route path="blog/:id" element={<BlogDetail />} />
            <Route path="articles" element={<ArticleList />} />
            <Route path="search" element={<Search />} />
            <Route path="category/:category" element={<CategoryPage />} />
            <Route path="tools" element={<Tools />} />
            <Route path="tools/image-cropper" element={<ImageCropper />} />
            <Route path="tools/image-ocr" element={<ImageOCR />} />
            <Route path="tools/json-formatter" element={<JsonFormatter />} />

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
            <Route 
              path="settings" 
              element={
                <ProtectedRoute>
                  <UserSettings />
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
