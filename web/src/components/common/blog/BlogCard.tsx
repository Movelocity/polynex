import { Link } from 'react-router-dom';
import { Blog } from '@/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Badge } from '@/components/x-ui/badge';
import { Button } from '@/components/x-ui/button';
import { 
  Calendar, 
  Eye, 
  Clock, 
  Edit, 
  Trash2
} from 'lucide-react';
import { UserAvatar } from '@/components/common/user/UserAvatar';

// Temporary formatDate function until we move it to a proper utils file
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export interface BlogCardProps {
  /** 博客数据 */
  blog: Blog;
  /** 布局模式 - grid: 网格布局, list: 列表布局 */
  layout?: 'grid' | 'list';
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 是否显示状态徽章 */
  showStatus?: boolean;
  /** 是否显示更新时间 */
  showUpdateTime?: boolean;
  /** 是否可点击链接到详情页 */
  clickable?: boolean;
  /** 摘要显示行数限制 */
  summaryLines?: number;
  /** 标签显示数量限制 */
  maxTags?: number;
  /** 操作按钮回调 */
  onEdit?: (blogId: string) => void;
  onDelete?: (blogId: string) => void;
  onToggleStatus?: (blogId: string, newStatus: 'published' | 'draft') => void;
  /** 自定义样式类名 */
  className?: string;
}

export function BlogCard({
  blog,
  layout = 'list',
  showActions = false,
  showStatus = false,
  showUpdateTime = false,
  clickable = true,
  summaryLines = 2,
  maxTags = 3,
  onEdit,
  onDelete,
  onToggleStatus,
  className = ''
}: BlogCardProps) {
  const canNavigate = clickable && (blog.status === 'published' || !showStatus);

  return (
    <Card className={`bg-background overflow-hidden ${className}`}>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start justify-between">
          <div className="flex-1">
            {/* Status and Category Badges */}
            <div className="flex items-center gap-2 mb-2">
              {showStatus && (
                <Badge 
                  variant={blog.status === 'published' ? 'default' : 'secondary'}
                  className={blog.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}
                >
                  {blog.status === 'published' ? '已发布' : '草稿'}
                </Badge>
              )}
              <Badge variant={showStatus ? 'outline' : 'secondary'}>
                {blog.category}
              </Badge>
              <div className="flex items-center text-muted-foreground text-sm">
                <Eye className="w-4 h-4 mr-1" />
                {blog.views}
              </div>
            </div>

            {/* Title */}
            <CardTitle className={`text-xl mb-2 ${layout === 'grid' ? 'group-hover:text-theme-blue transition-colors' : ''}`}>
              {canNavigate ? (
                <Link 
                  to={`/blog/${blog.id}`}
                  className="hover:text-theme-blue transition-colors item-title"
                >
                  {blog.title}
                </Link>
              ) : (
                <span className="text-foreground item-title">
                  {blog.title}
                </span>
              )}
            </CardTitle>

            {/* Summary */}
            <CardDescription className={`line-clamp-${summaryLines} mb-4`}>
              {blog.summary}
            </CardDescription>
            
            {/* Author and Time Info */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <UserAvatar 
                  username={blog.authorName}
                  size="xs"
                />
                <span className="text-sm text-foreground">{blog.authorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-1" />
                  创建：{formatDate(blog.createTime)}
                </div>
                {showUpdateTime && blog.updateTime !== blog.createTime && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    更新：{formatDate(blog.updateTime)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Tags */}
            {blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {blog.tags.slice(0, maxTags).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {blog.tags.length > maxTags && (
                  <Badge variant="outline" className="text-xs">
                    +{blog.tags.length - maxTags}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-center space-x-2 ml-4">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(blog.id)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
              )}
              
              {onToggleStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleStatus(blog.id, blog.status === 'draft' ? 'published' : 'draft')}
                >
                  {blog.status === 'draft' ? '发布' : '撤回'}
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/5"
                  onClick={() => onDelete(blog.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  删除
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
} 