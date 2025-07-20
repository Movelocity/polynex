import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Toaster } from '@/components/x-ui/toaster';
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
import { ImageCropper } from '@/pages/tools/ImageCropper';
import { ImageOCR } from '@/pages/tools/ImageOCR';
import { JsonFormatter } from '@/pages/tools/JsonFormatter';
import { AIProviderManagement } from '@/pages/chat/AIProviderManagement';
import { AgentManagement } from '@/pages/chat/AgentManagement';
import { AgentEditor } from '@/pages/chat/AgentEditor';
import { ConversationManagement } from '@/pages/chat/ConversationManagement';
import { Conversation } from '@/pages/chat/Conversation';
import { NotFound } from '@/pages/NotFound';
import { ServiceDemo } from '@/components/ServiceDemo';
import { ThemeDemo } from '@/components/ThemeDemo';

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
          <Route path="/theme-demo" element={<ThemeDemo />} />

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

          <Route path="/dashboard" element={<Layout showFooter={false} />} >
            <Route index element={<Dashboard />} />
          </Route>

          <Route path="/chat" element={<Layout showFooter={false} />} >
            <Route path="ai-provider-management" element={
              // <ProtectedRoute requireAdmin> 现在每个用户都可以管理自己的AI供应商配置
              <ProtectedRoute>
                <AIProviderManagement />
              </ProtectedRoute>
            } />
            <Route path="agents" element={
              <ProtectedRoute>
                <AgentManagement />
              </ProtectedRoute>
            } />
            <Route path="agent/edit/:agentId" element={
              <ProtectedRoute>
                <AgentEditor />
              </ProtectedRoute>
            } />
            <Route path="conversation-management" element={
              <ProtectedRoute>
                <ConversationManagement />
              </ProtectedRoute>
            } />
            <Route path="conversation" element={
              <ProtectedRoute>
                <Conversation />
              </ProtectedRoute>
            } />
          </Route>

        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
