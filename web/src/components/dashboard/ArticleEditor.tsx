
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { 
  Save, 
  X,
  Globe,
  Lock,
  Eye,
  Edit
} from 'lucide-react';

interface ArticleEditorProps {
  blogId?: string;
  onSave?: (article: Blog) => void;
  onPublishToggle?: (article: Blog, isPublished: boolean) => void;
  onCreated?: (article: Blog) => void;
  className?: string;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const generateSummary = (content: string): string => {
  const plainText = content
    .replace(/[#*`>\\-_\\[\\]()]/g, '')
    .replace(/\\n/g, ' ')
    .trim();
  
  return plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;
};

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  blogId,
  onSave,
  onPublishToggle,
  onCreated,
  className
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '随笔',
    tags: [] as string[],
    status: 'draft' as 'published' | 'draft',
  });
  
  const [tagInput, setTagInput] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  // const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('write');
  const [isEdit, setIsEdit] = useState(false);
  const [article, setArticle] = useState<Blog | null>(null);
  
  // Image upload dialog state
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [pastedImageFile, setPastedImageFile] = useState<File | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const { user } = useAuth();
  // const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load data on mount and when blogId changes
  useEffect(() => {
    loadInitialData();
    if (blogId) {
      setIsEdit(true);
    }
  }, [blogId]);

  const loadInitialData = async () => {
    try {
      const allCategories = await categoryService.getCategories();
      setCategories(allCategories);

      if (blogId) {
        const blog = await blogService.getBlogById(blogId);
        if (blog) {
          setArticle(blog);
          setFormData({
            title: blog.title,
            content: blog.content,
            category: blog.category,
            tags: blog.tags,
            status: blog.status,
          });
        }
      }
    } catch (err) {
      console.error('加载初始数据失败:', err);
      setError('加载数据失败，请刷新页面重试');
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

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const textarea = textareaRef.current;
        if (textarea) {
          setCursorPosition(textarea.selectionStart);
        }
        
        setPastedImageFile(file);
        setShowImageUploadDialog(true);
      }
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File, altText: string) => {
    try {
      const response = await fileService.uploadFile(file);
      const imageUrl = `/api/resources/${response.uniqueId}${response.extension}`;
      
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

      if (isEdit && article) {
        const updatedArticle = {
          ...article,
          title: formData.title,
          content: formData.content,
          summary,
          category: formData.category,
          tags: formData.tags,
          updateTime: now,
        };

        const success = await blogService.updateBlog(article.id, {
          title: formData.title,
          content: formData.content,
          summary,
          category: formData.category,
          tags: formData.tags,
          updateTime: now,
        });

        if (success) {
          onSave?.(updatedArticle);
          toast({
            title: "保存成功",
            description: "文章内容已保存",
          });
        } else {
          toast({
            title: "更新文章失败",
            description: "请检查网络连接后重试",
          });
        }
      } else {
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
          status: 'draft',
          views: 0,
        };

        const createdBlog = await blogService.addBlog(newBlog);
        if (createdBlog) {
          setIsEdit(true);
          onCreated?.(createdBlog);
          toast({
            title: "创建成功",
            description: "文章已保存为草稿",
          });
        }
      }
    } catch (err: any) {
      console.error('保存文章失败:', err);
      
      if (err?.status === 401) {
        toast({
          title: "登录已过期",
          description: "系统将自动跳转到登录页面，请重新登录后再保存文章",
        });
      } else {
        toast({
          title: "保存文章失败",
          description: "请检查网络连接后重试",
        });
      }
    } finally {
      setSaveLoading(false);
    }
  }, [user, formData, isEdit, article, validateForm, onSave, onCreated]);

  const handleTogglePublish = async () => {
    if (!user || !article) {
      setError('请先登录并保存文章');
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!isEdit) {
      toast({
        title: "请先保存文章",
        description: "新文章需要先保存后才能发布",
      });
      return;
    }

    setPublishLoading(true);
    
    try {
      const newStatus = formData.status === 'published' ? false : true;
      const success = await blogService.setPublishStatus(article.id, newStatus);
      
      if (success) {
        const newStatusText = newStatus ? 'published' : 'draft';
        setFormData(prev => ({
          ...prev,
          status: newStatusText as 'published' | 'draft'
        }));
        
        onPublishToggle?.(article, newStatus);
        
        toast({
          title: newStatus ? "发布成功" : "取消发布",
          description: newStatus ? "文章已公开发布" : "文章已设为草稿状态",
        });
      } else {
        toast({
          title: "操作失败",
          description: "请检查网络连接后重试",
        });
      }
    } catch (err: any) {
      console.error('切换发布状态失败:', err);
      
      if (err?.status === 401) {
        toast({
          title: "登录已过期",
          description: "系统将自动跳转到登录页面，请重新登录",
        });
      } else {
        toast({
          title: "操作失败",
          description: "请检查网络连接后重试",
        });
      }
    } finally {
      setPublishLoading(false);
    }
  };

  // Global save shortcut
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

  return (
    <div className="h-full flex flex-col">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Editor */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground p-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <span className="w-full md:w-1/2">
              <input
                id="title"
                placeholder="Title..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-3xl font-bold outline-none bg-transparent text-foreground w-full"
              />
            </span>
            <span className="flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">{article?.createTime?.split('.')[0]?.replace('T', ' ')}</span>
              {isEdit && (
                <Button 
                  onClick={handleTogglePublish}
                  disabled={publishLoading || saveLoading}
                  variant='outline'
                  size="sm"
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
              <Button 
                variant="default" 
                size="sm"
                onClick={handleSave}
                disabled={saveLoading || publishLoading}
              >
                <Save className="w-4 h-4 mr-2" />保存
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab(activeTab === 'write' ? 'preview' : 'write');
                }}
              >
                {activeTab === 'write' ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                {activeTab === 'write' ? '预览' : '编辑'}
              </Button>
            </span>
          </div>
          <div className={cn("border-t border-border flex-1 h-[calc(100vh-160px)] md:h-[calc(100vh-120px)] min-h-0")}>
            {activeTab === 'write' && (
              <div className={cn("relative pb-8 h-full flex flex-col")}>
                <TextareaAutosize
                  ref={textareaRef}
                  id="content"
                  placeholder="开始编写您的文章... 支持 Markdown 语法：**粗体**、*斜体*、`代码`、[链接](url)、![图片](url) 等。支持粘贴图片直接上传。"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  onPaste={handlePaste}
                  className={cn(
                    "w-full p-4 rounded-lg resize-none outline-none bg-secondary text-[#000c] dark:text-[#fffc]"
                  )}
                  spellCheck={false}
                  minRows={10}
                />
                
              </div>
            )}
            {activeTab === 'preview' && (
              <div className={cn("px-2 h-full overflow-auto px-4 py-2 mv-12")}>
                <MarkdownPreview content={formData.content} />
              </div>
            )}
          </div>
          
        </div>

        {/* Sidebar */}
        {/* <div className={sidebarClasses}>
          <Card className={compact ? "h-full flex flex-col" : "sticky top-20"}>
            <CardHeader>
              <CardTitle>文章设置</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-2", compact && "flex-1 overflow-auto")}>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="category">选择分类</Label>
                  <Select onValueChange={(value) => handleInputChange('category', value)}>
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
              
            </CardContent>
          </Card>
        </div> */}
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
};