import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { MarkdownPreview } from '@/components/common/markdown-preview';
import { blogService, categoryService } from '@/services';
import { Blog, Category } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/x-ui/select';
import { Badge } from '@/components/x-ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/x-ui/tabs';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { useTitle } from '@/hooks/usePageTitle';
import { userService } from '@/services';
import { 
  Save, 
  Eye, 
  Send, 
  X,
  Tag,
  FileText,
  Loader2
} from 'lucide-react';

// Temporary utility functions until we move them to proper utils
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generateSummary = (content: string): string => {
  // Remove markdown syntax and get first 200 characters
  const plainText = content
    .replace(/[#*`>\-_\[\]()]/g, '') // Remove markdown characters
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .trim();
  
  return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
};

function MarkdownGuide() {
  return (
    <Card className="hidden lg:block bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg text-blue-800">Markdown 快速指南</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-blue-700 space-y-2">
        <div><code># 标题</code> - 一级标题</div>
        <div><code>## 标题</code> - 二级标题</div>
        <div><code>**粗体**</code> - 粗体文字</div>
        <div><code>*斜体*</code> - 斜体文字</div>
        <div><code>`代码`</code> - 行内代码</div>
        <div><code>[链接](url)</code> - 链接</div>
        <div><code>![图片](url)</code> - 图片</div>
        <div><code>- 列表</code> - 无序列表</div>
        <div><code>1. 列表</code> - 有序列表</div>
        <div><code>&gt; 引用</code> - 引用块</div>
      </CardContent>
    </Card>
  )
}

export function WriteBlog() {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '随笔',
    tags: [] as string[],
    status: 'draft' as 'published' | 'draft',
  });
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // 动态设置页面标题 - 根据是否为编辑模式设置不同标题
  useTitle(isEdit ? '编辑文章' : '写文章');

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      // 加载分类
      const allCategories = await categoryService.getCategories();
      setCategories(allCategories);

      // 如果是编辑模式，加载博客数据
      if (id) {
        await loadBlog(id);
      }
    } catch (err) {
      console.error('加载初始数据失败:', err);
      setError('加载数据失败，请刷新页面重试');
    }
  };

  const loadBlog = async (blogId: string) => {
    setLoading(true);
    try {
      const blog = await blogService.getBlogById(blogId);
      if (blog) {
        // 检查是否是作者
        if (user && blog.authorId === user.id) {
          setFormData({
            title: blog.title,
            content: blog.content,
            category: blog.category,
            tags: blog.tags,
            status: blog.status,
          });
          setIsEdit(true);
        } else {
          setError('您没有编辑此文章的权限');
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        setError('文章不存在');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('加载文章失败:', err);
      setError('加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('请输入文章标题');
      return false;
    }
    if (!formData.content.trim()) {
      setError('请输入文章内容');
      return false;
    }
    if (!formData.category) {
      setError('请选择文章分类');
      return false;
    }
    return true;
  };

  const handleSave = async (status: 'published' | 'draft') => {
    if (!user) {
      setError('请先登录');
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (status === 'published') {
      setLoading(true);
    } else {
      setSaveLoading(true);
    }

    try {
      // 在保存前验证认证状态是否有效
      const validation = await userService.validateToken();
      if (!validation.valid) {
        setError('登录已过期，请重新登录');
        setLoading(false);
        setSaveLoading(false);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }
      
      const summary = generateSummary(formData.content);
      const now = new Date().toISOString();

      if (isEdit && id) {
        // 更新博客
        const success = await blogService.updateBlog(id, {
          title: formData.title,
          content: formData.content,
          summary,
          category: formData.category,
          tags: formData.tags,
          status,
          updateTime: now,
        });

        if (success) {
          navigate(status === 'published' ? `/blog/${id}` : '/dashboard');
        } else {
          setError('更新文章失败');
        }
      } else {
        // 创建新博客
        const newBlog: Blog = {
          id: generateId(),
          title: formData.title,
          content: formData.content,
          summary,
          category: formData.category,
          tags: formData.tags,
          authorId: user.id,
          authorName: user.username,
          createTime: now,
          updateTime: now,
          status,
          views: 0,
        };

        const createdBlog = await blogService.addBlog(newBlog);
        navigate(status === 'published' ? `/blog/${createdBlog.id}` : '/dashboard');
      }
    } catch (err: any) {
      console.error('保存文章失败:', err);
      
      // 处理认证相关错误
      if (err?.status === 401 || err?.message?.includes('登录') || err?.message?.includes('认证') || err?.message?.includes('token')) {
        setError('登录已过期，即将跳转到登录页面，请重新登录后再保存文章');
        // 延迟跳转到登录页面，让用户看到错误信息
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError('保存文章失败，请检查网络连接后重试');
      }
    } finally {
      setLoading(false);
      setSaveLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Editor */}
        <div className="col-span-1 lg:col-span-3">
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <input
                id="title"
                placeholder="输入一个吸引人的标题..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-3xl font-bold outline-none"
              />
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between">
                <TabsList>
                  <TabsTrigger value="write" className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    编辑
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex items-center">
                    <Eye className="w-4 h-4 mr-2" />
                    预览
                  </TabsTrigger>
                </TabsList>
                <div className="flex gap-2 ml-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSave('draft')}
                    disabled={saveLoading || loading}
                  >
                    {saveLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        保存草稿
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => handleSave('published')}
                    disabled={loading || saveLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        发布中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        发布文章
                      </>
                    )}
                  </Button>
                </div>
                </div>
                <TabsContent value="write" className="min-h-[600px]">
                  <div>
                    <TextareaAutosize
                      id="content"
                      placeholder="开始编写您的文章... 支持 Markdown 语法"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      className="w-full mt-2 border rounded-lg resize-none border-transparent outline-none"
                      minRows={20}
                    />
                    <div className="text-xs text-slate-500 mt-2">
                      支持 Markdown 语法：**粗体**、*斜体*、`代码`、[链接](url)、![图片](url) 等
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-4 p-4 min-h-[600px]">
                  <MarkdownPreview content={formData.content} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-1 space-y-6">
          
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  分类 & 标签设置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="category">选择分类</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="选择文章分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tagInput">添加标签</Label>
                    <div className="flex space-x-2 mt-2">
                      <Input
                        id="tagInput"
                        placeholder="输入标签名"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={formData.tags.length >= 5}
                      />
                      <Button 
                        size="sm" 
                        onClick={handleAddTag}
                        disabled={!tagInput.trim() || formData.tags.length >= 5}
                      >
                        添加
                      </Button>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      最多可添加 5 个标签，按回车键快速添加
                    </div>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div>
                      <Label>已添加的标签</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          

          <div className="hidden lg:block">
            {/* Markdown Guide */}
            <MarkdownGuide />
          </div>
        </div>
        

        
      </div>
    </div>
  );
}
