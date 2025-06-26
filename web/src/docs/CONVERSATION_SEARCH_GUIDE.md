# 对话搜索功能使用指南

## 概述

前端对话搜索功能允许用户在自己的对话历史中搜索特定的关键词，支持搜索对话标题和消息内容，并提供智能的上下文预览。

## 类型定义

### SearchRequest
```typescript
interface SearchRequest {
  query: string;      // 搜索关键词
  limit?: number;     // 返回结果数量限制，默认20
  offset?: number;    // 结果偏移量，默认0，用于分页
}
```

### ConversationSearchResult
```typescript
interface ConversationSearchResult {
  id: string;           // 对话ID
  session_id: string;   // 会话ID
  title: string;        // 对话标题
  match_count: number;  // 匹配次数
  context: string;      // 首次匹配附近的120个字符
  create_time: string;  // 对话创建时间
  update_time: string;  // 对话最后更新时间
}
```

### SearchResponse
```typescript
interface SearchResponse {
  results: ConversationSearchResult[];  // 搜索结果列表
  total_count: number;                  // 总匹配数量
  query: string;                        // 原始搜索查询
}
```

## API服务使用

### 直接使用 ConversationApiService

```typescript
import { conversationService } from '@/services';

// 搜索对话
const searchResults = await conversationService.searchConversations({
  query: "Python编程",
  limit: 10,
  offset: 0
});

console.log(`找到 ${searchResults.total_count} 个匹配的对话`);
searchResults.results.forEach(result => {
  console.log(`${result.title} (匹配${result.match_count}次)`);
  console.log(`上下文: ${result.context}`);
});
```

## 使用自定义Hook (推荐)

### useConversationSearch Hook

```typescript
import { useConversationSearch } from '@/hooks/useConversationSearch';

function SearchComponent() {
  const {
    searchResults,
    totalCount,
    currentQuery,
    isSearching,
    hasSearched,
    searchConversations,
    clearResults,
    resetSearch
  } = useConversationSearch();

  const [searchInput, setSearchInput] = useState('');

  const handleSearch = () => {
    if (searchInput.trim()) {
      searchConversations(searchInput.trim());
    }
  };

  const handleLoadMore = () => {
    if (searchResults.length < totalCount) {
      searchConversations(currentQuery, 20, searchResults.length);
    }
  };

  return (
    <div>
      {/* 搜索输入框 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索对话内容..."
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          disabled={isSearching}
        />
        <button 
          onClick={handleSearch} 
          disabled={isSearching || !searchInput.trim()}
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
        {hasSearched && (
          <button onClick={resetSearch}>
            清空
          </button>
        )}
      </div>

      {/* 搜索结果统计 */}
      {hasSearched && (
        <div className="mb-4">
          <p>找到 {totalCount} 个匹配的对话</p>
        </div>
      )}

      {/* 搜索结果列表 */}
      <div className="space-y-4">
        {searchResults.map((result) => (
          <div key={result.id} className="border p-4 rounded">
            <h3 className="font-bold">{result.title}</h3>
            <p className="text-sm text-gray-600">
              匹配 {result.match_count} 次 • {new Date(result.update_time).toLocaleDateString()}
            </p>
            <p className="mt-2 text-sm bg-gray-100 p-2 rounded">
              {result.context}
            </p>
            <button 
              onClick={() => handleConversationSelect(result.id)}
              className="mt-2 text-blue-600 hover:underline"
            >
              打开对话
            </button>
          </div>
        ))}
      </div>

      {/* 加载更多按钮 */}
      {searchResults.length < totalCount && (
        <div className="mt-4 text-center">
          <button 
            onClick={handleLoadMore}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {isSearching ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
}
```

## Hook API 详解

### 状态

- **searchResults**: `ConversationSearchResult[]` - 搜索结果数组
- **totalCount**: `number` - 总匹配数量
- **currentQuery**: `string` - 当前搜索查询
- **isSearching**: `boolean` - 是否正在搜索
- **hasSearched**: `boolean` - 是否已进行过搜索

### 方法

#### searchConversations(query, limit?, offset?)
执行搜索操作
- `query`: 搜索关键词（必需）
- `limit`: 返回结果数量限制（可选，默认20）
- `offset`: 结果偏移量（可选，默认0）

#### clearResults()
清空搜索结果，但保留搜索状态

#### resetSearch()
重置所有搜索状态，包括结果、查询和状态标志

## 搜索特性

1. **智能排序**: 按匹配次数优先，更新时间次之
2. **上下文预览**: 显示匹配位置前后120个字符的内容
3. **来源标识**: 区分匹配来自标题、用户消息还是AI回复
4. **分页支持**: 支持加载更多结果
5. **错误处理**: 完善的错误提示和处理
6. **自动提示**: 搜索完成后自动显示结果统计

## Context 字段格式说明

Context字段会根据匹配位置显示不同的前缀：

- `[标题] ...` - 匹配发生在对话标题中
- `[用户] ...` - 匹配发生在用户消息中  
- `[助手] ...` - 匹配发生在AI助手回复中
- `[系统] ...` - 匹配发生在系统消息中

## 最佳实践

1. **防抖处理**: 在实际应用中建议对搜索输入添加防抖，避免频繁请求
2. **缓存结果**: 可以考虑缓存搜索结果，提升用户体验
3. **键盘快捷键**: 支持Enter键搜索，Escape键清空
4. **加载状态**: 在搜索时显示适当的加载指示器
5. **错误处理**: 妥善处理网络错误和权限错误

## 示例：带防抖的搜索组件

```typescript
import { useState, useEffect } from 'react';
import { useConversationSearch } from '@/hooks/useConversationSearch';
import { useDebounce } from '@/hooks/useDebounce'; // 需要实现防抖hook

function DebouncedSearchComponent() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchTerm = useDebounce(searchInput, 500); // 500ms防抖
  
  const {
    searchResults,
    totalCount,
    isSearching,
    searchConversations,
    resetSearch
  } = useConversationSearch();

  // 当防抖后的搜索词改变时执行搜索
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      searchConversations(debouncedSearchTerm.trim());
    } else {
      resetSearch();
    }
  }, [debouncedSearchTerm]);

  return (
    <div>
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="搜索对话内容..."
      />
      
      {isSearching && <div>搜索中...</div>}
      
      {/* 渲染搜索结果... */}
    </div>
  );
}
``` 