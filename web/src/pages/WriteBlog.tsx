import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { MarkdownPreview } from '@/components/common/MarkdownPreview';
import { ImageUploadDialog } from '@/components/common/ImageUploadDialog';
import { blogService, categoryService, fileService } from '@/services';
import { Blog, Category } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/x-ui/button';
import { Input } from '@/components/x-ui/input';
import { Label } from '@/components/x-ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/CustomSelect';
import { Badge } from '@/components/x-ui/badge';
import { Alert, AlertDescription } from '@/components/x-ui/alert';
import { useTitle } from '@/hooks/usePageTitle';
import { toast } from '@/hooks/use-toast';

import { 
  Save, 
  X,
  Globe,
  Lock
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
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  
  // Image upload dialog state
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [pastedImageFile, setPastedImageFile] = useState<File | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // const { toast } = useToast();

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

  // Handle paste events for image detection
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        // Store current cursor position
        const textarea = textareaRef.current;
        if (textarea) {
          setCursorPosition(textarea.selectionStart);
        }
        
        setPastedImageFile(file);
        setShowImageUploadDialog(true);
      }
    }
  }, []);

  // Handle image upload from dialog
  const handleImageUpload = useCallback(async (file: File, altText: string) => {
    try {
      const response = await fileService.uploadFile(file);
      const imageUrl = `/api/resources/${response.uniqueId}${response.extension}`;
      
      // Insert markdown image link at cursor position
      const markdownLink = `![${altText}](${imageUrl})`;
      const textarea = textareaRef.current;
      
      if (textarea) {
        const content = formData.content;
        const beforeCursor = content.substring(0, cursorPosition);
        const afterCursor = content.substring(cursorPosition);
        const newContent = beforeCursor + markdownLink + afterCursor;
        
        setFormData(prev => ({
          ...prev,
          content: newContent
        }));
        
        // Set cursor position after the inserted link
        setTimeout(() => {
          const newCursorPos = cursorPosition + markdownLink.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
      
      toast({
        title: "图片上传成功",
        description: "图片已插入到文章中",
      });
    } catch (error: any) {
      console.error('Image upload failed:', error);
      throw new Error(error.message || '图片上传失败');
    }
  }, [formData.content, cursorPosition, toast]);

  const validateForm = useCallback(() => {
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
  }, [formData.title, formData.content, formData.category]);

  const handleSave = useCallback(async () => {
    if (!user) {
      setError('请先登录');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaveLoading(true);

    try {
      const summary = generateSummary(formData.content);
      const now = new Date().toISOString();

      if (isEdit && id) {
        // 更新博客内容，但不改变发布状态
        const success = await blogService.updateBlog(id, {
          title: formData.title,
          content: formData.content,
          summary,
          category: formData.category,
          tags: formData.tags,
          updateTime: now,
        });

        if (success) {
          toast.success({
            title: "保存成功",
            description: "文章内容已保存",
          });
        } else {
          toast.error({
            title: "更新文章失败",
            description: "请检查网络连接后重试",
          });
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
          status: 'draft', // 新创建的博客默认为草稿状态
          views: 0,
        };

        const createdBlog = await blogService.addBlog(newBlog);
        toast.success({
          title: "创建成功",
          description: "文章已保存为草稿",
        });
        
        // 更新ID以便后续操作
        if (createdBlog && createdBlog.id) {
          navigate(`/edit/${createdBlog.id}`);
        }
      }
    } catch (err: any) {
      console.error('保存文章失败:', err);
      
      // 处理认证相关错误 - 401错误由ApiClient自动处理，这里只处理用户提示
      if (err?.status === 401) {
        toast.error({
          title: "登录已过期",
          description: "系统将自动跳转到登录页面，请重新登录后再保存文章",
        });
      } else {
        toast.error({
          title: "保存文章失败",
          description: "请检查网络连接后重试",
        });
      }
    } finally {
      setSaveLoading(false);
    }
  }, [user, formData, isEdit, id, navigate, validateForm]);

  // 全局快捷键保存
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (saveLoading || publishLoading) {
          return;
        }
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveLoading, publishLoading, handleSave]);

  const handleTogglePublish = async () => {
    if (!user) {
      setError('请先登录');
      return;
    }

    if (!validateForm()) {
      return;
    }

    // 如果是新文章，需要先保存
    if (!isEdit) {
      toast.error({
        title: "请先保存文章",
        description: "新文章需要先保存后才能发布",
      });
      return;
    }

    setPublishLoading(true);
    
    try {
      if (id) {
        const newStatus = formData.status === 'published' ? false : true;
        const success = await blogService.setPublishStatus(id, newStatus);
        
        if (success) {
          const newStatusText = newStatus ? 'published' : 'draft';
          setFormData(prev => ({
            ...prev,
            status: newStatusText as 'published' | 'draft'
          }));
          
          toast.success({
            title: newStatus ? "发布成功" : "取消发布",
            description: newStatus ? "文章已公开发布" : "文章已设为草稿状态",
          });
        } else {
          toast.error({
            title: "操作失败",
            description: "请检查网络连接后重试",
          });
        }
      }
    } catch (err: any) {
      console.error('切换发布状态失败:', err);
      
      if (err?.status === 401) {
        toast.error({
          title: "登录已过期",
          description: "系统将自动跳转到登录页面，请重新登录",
        });
      } else {
        toast.error({
          title: "操作失败",
          description: "请检查网络连接后重试",
        });
      }
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-2 mb-8">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle> 文章设置 </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="pretty" 
                  onClick={handleSave}
                  disabled={saveLoading || publishLoading}
                >
                  <Save className="w-4 h-4 mr-2" />保存
                </Button>
                <Button className="" onClick={() => {
                  if (activeTab === 'write') {
                    setActiveTab('preview');
                  } else {
                    setActiveTab('write');
                  }
                }}>
                  {activeTab === 'write' ? '预览' : '编辑'}
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="category">选择分类</Label>
                  <Select defaultValue={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
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
                  <div className="text-xs text-muted-foreground mt-1">
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
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {isEdit && (
                <Button 
                  onClick={handleTogglePublish}
                  disabled={publishLoading || saveLoading}
                  variant='outline'
                >
                  {formData.status === 'published' ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />设为草稿
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />发布
                    </>
                  )}
                </Button>
              )}
              
            </CardContent>
          </Card>
        </div>

        {/* Editor */}
        <div className="col-span-1 lg:col-span-4">
          <Card>
            <CardHeader className="py-3">
              <input
                id="title"
                placeholder="Title..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-3xl font-bold outline-none bg-secondary"
              />
            </CardHeader>
            <CardContent className="border-t border-border py-4 px-0 md:px-4">
              {activeTab === 'write' && (
                <div className="relative min-h-[600px] pb-4">
                  <TextareaAutosize
                    ref={textareaRef}
                    id="content"
                    placeholder="开始编写您的文章..."
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    onPaste={handlePaste}
                    className="w-full p-2 rounded-lg resize-none outline-none bg-secondary text-[#000c] dark:text-[#fffc]"
                    spellCheck={false}
                    minRows={20}
                  />
                  <div className="text-xs text-muted-foreground absolute bottom-0">
                    支持 Markdown 语法：**粗体**、*斜体*、`代码`、[链接](url)、![图片](url) 等。支持粘贴图片直接上传。
                  </div>
                </div>
              )}
              {activeTab === 'preview' && (
                <div className="min-h-[600px] px-2">
                  <MarkdownPreview content={formData.content} />
                </div>  
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>

      {/* Image Upload Dialog */}
      {pastedImageFile && (
        <ImageUploadDialog
          open={showImageUploadDialog}
          onOpenChange={setShowImageUploadDialog}
          imageFile={pastedImageFile}
          onUpload={handleImageUpload}
        />
      )}
    </div>
  );
}
