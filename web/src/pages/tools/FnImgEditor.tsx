import React, { useState } from 'react';
import { ImageEditorPanel } from '@/components/ImageEditor/ImageEditorPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/x-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/x-ui/tabs';
import { Code, Image as ImageIcon } from 'lucide-react';

export function FnImgEditor() {
  const [activeTab, setActiveTab] = useState('editor');
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            编辑器
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            使用说明
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="mt-0">
          <ImageEditorPanel />
        </TabsContent>
        
        <TabsContent value="instructions" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3>功能介绍</h3>
                <p>
                  这是一个基于函数指令的图片编辑器，支持以下三种核心操作：
                </p>
                
                <h4>1. 裁剪 (Crop)</h4>
                <p>
                  从图片中裁剪出指定区域的内容。
                </p>
                <ul>
                  <li><strong>X坐标</strong>: 裁剪区域左上角的X坐标</li>
                  <li><strong>Y坐标</strong>: 裁剪区域左上角的Y坐标</li>
                  <li><strong>宽度</strong>: 裁剪区域的宽度</li>
                  <li><strong>高度</strong>: 裁剪区域的高度</li>
                </ul>
                
                <h4>2. 调整大小 (Resize)</h4>
                <p>
                  将图片调整为指定的尺寸。
                </p>
                <ul>
                  <li><strong>宽度</strong>: 目标宽度</li>
                  <li><strong>高度</strong>: 目标高度</li>
                </ul>
                
                <h4>3. 填充 (Pad)</h4>
                <p>
                  在图片周围添加指定颜色和大小的填充。
                </p>
                <ul>
                  <li><strong>上/右/下/左边距</strong>: 各方向的填充大小</li>
                  <li><strong>填充颜色</strong>: 填充区域的颜色</li>
                </ul>
                
                <h3>使用方法</h3>
                <ol>
                  <li>点击"选择文件"上传图片</li>
                  <li>选择要执行的编辑指令类型</li>
                  <li>设置相应的参数</li>
                  <li>点击"应用指令"执行编辑</li>
                  <li>使用"撤销"和"重做"按钮管理编辑历史</li>
                </ol>
                
                <h3>技术特点</h3>
                <ul>
                  <li>完全基于函数式指令操作</li>
                  <li>支持编辑历史和撤销/重做功能</li>
                  <li>实时预览编辑效果</li>
                  <li>响应式设计，适配不同屏幕尺寸</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}