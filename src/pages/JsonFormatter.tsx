import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileJson, 
  Code, 
  Minimize2, 
  Copy, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export function JsonFormatter() {
  const [inputJson, setInputJson] = useState('');
  const [outputJson, setOutputJson] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [indentSize, setIndentSize] = useState(2);

  // 格式化JSON
  const formatJson = useCallback(() => {
    if (!inputJson.trim()) {
      toast({
        title: '提示',
        description: '请输入JSON内容',
        variant: 'destructive'
      });
      return;
    }

    try {
      const parsed = JSON.parse(inputJson);
      const formatted = JSON.stringify(parsed, null, indentSize);
      setOutputJson(formatted);
      setIsValid(true);
      setErrorMessage('');
      toast({
        title: '成功',
        description: 'JSON格式化完成'
      });
    } catch (error) {
      setIsValid(false);
      setErrorMessage(error instanceof Error ? error.message : '未知错误');
      setOutputJson('');
      toast({
        title: '格式化失败',
        description: 'JSON格式不正确',
        variant: 'destructive'
      });
    }
  }, [inputJson, indentSize]);

  // 压缩JSON
  const compressJson = useCallback(() => {
    if (!inputJson.trim()) {
      toast({
        title: '提示',
        description: '请输入JSON内容',
        variant: 'destructive'
      });
      return;
    }

    try {
      const parsed = JSON.parse(inputJson);
      const compressed = JSON.stringify(parsed);
      setOutputJson(compressed);
      setIsValid(true);
      setErrorMessage('');
      toast({
        title: '成功',
        description: 'JSON压缩完成'
      });
    } catch (error) {
      setIsValid(false);
      setErrorMessage(error instanceof Error ? error.message : '未知错误');
      setOutputJson('');
      toast({
        title: '压缩失败',
        description: 'JSON格式不正确',
        variant: 'destructive'
      });
    }
  }, [inputJson]);

  // 验证JSON
  const validateJson = useCallback(() => {
    if (!inputJson.trim()) {
      setIsValid(null);
      setErrorMessage('');
      return;
    }

    try {
      JSON.parse(inputJson);
      setIsValid(true);
      setErrorMessage('');
      toast({
        title: '验证通过',
        description: 'JSON格式正确'
      });
    } catch (error) {
      setIsValid(false);
      setErrorMessage(error instanceof Error ? error.message : '未知错误');
      toast({
        title: '验证失败',
        description: 'JSON格式不正确',
        variant: 'destructive'
      });
    }
  }, [inputJson]);

  // 复制输出结果
  const copyOutput = useCallback(() => {
    if (outputJson) {
      navigator.clipboard.writeText(outputJson);
      toast({
        title: '成功',
        description: '内容已复制到剪贴板'
      });
    }
  }, [outputJson]);

  // 复制输入内容
  const copyInput = useCallback(() => {
    if (inputJson) {
      navigator.clipboard.writeText(inputJson);
      toast({
        title: '成功',
        description: '内容已复制到剪贴板'
      });
    }
  }, [inputJson]);

  // 清空所有内容
  const clearAll = useCallback(() => {
    setInputJson('');
    setOutputJson('');
    setIsValid(null);
    setErrorMessage('');
  }, []);

  // 使用示例
  const useExample = useCallback(() => {
    const exampleJson = {
      "name": "张三",
      "age": 25,
      "address": {
        "city": "北京",
        "district": "朝阳区",
        "street": "建国路1号"
      },
      "hobbies": ["阅读", "音乐", "旅行"],
      "isMarried": false,
      "salary": null,
      "skills": {
        "programming": ["JavaScript", "Python", "Java"],
        "languages": ["中文", "英文"],
        "certifications": [
          {
            "name": "软件工程师认证",
            "issuer": "工信部",
            "date": "2023-05-15"
          }
        ]
      }
    };
    
    setInputJson(JSON.stringify(exampleJson, null, 2));
    setIsValid(null);
    setErrorMessage('');
    setOutputJson('');
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            to="/tools" 
            className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回工具列表
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">JSON 格式化工具</h1>
        <p className="text-slate-600">格式化、压缩、验证JSON数据，支持语法高亮显示</p>
      </div>

      {/* 控制面板 */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>操作面板</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              <Button onClick={formatJson} className="flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>格式化</span>
              </Button>
              
              <Button onClick={compressJson} variant="outline" className="flex items-center space-x-2">
                <Minimize2 className="w-4 h-4" />
                <span>压缩</span>
              </Button>
              
              <Button onClick={validateJson} variant="outline" className="flex items-center space-x-2">
                {isValid === true ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : isValid === false ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <FileJson className="w-4 h-4" />
                )}
                <span>验证</span>
              </Button>
              
              <Button onClick={useExample} variant="outline">
                使用示例
              </Button>
              
              <Button onClick={clearAll} variant="outline" className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>清空</span>
              </Button>
              
              <div className="flex items-center space-x-2 ml-auto">
                <Label htmlFor="indent-size" className="text-sm">缩进:</Label>
                <Input
                  id="indent-size"
                  type="number"
                  min="1"
                  max="8"
                  value={indentSize}
                  onChange={(e) => setIndentSize(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 验证状态显示 */}
      {(isValid !== null || errorMessage) && (
        <div className="mb-6">
          <Card className={`border ${isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                {isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${isValid ? 'text-green-800' : 'text-red-800'}`}>
                    {isValid ? 'JSON格式正确' : 'JSON格式错误'}
                  </p>
                  {errorMessage && (
                    <p className="text-red-700 text-sm mt-1 font-mono">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 输入区域 */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <FileJson className="w-5 h-5" />
                  <span>JSON 输入</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyInput}
                  disabled={!inputJson}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
              </CardTitle>
              <CardDescription>
                在此处输入需要处理的JSON数据
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  id="input-json"
                  value={inputJson}
                  onChange={(e) => {
                    setInputJson(e.target.value);
                    setIsValid(null);
                    setErrorMessage('');
                  }}
                  placeholder='请输入JSON数据，例如：&#10;{&#10;  "name": "张三",&#10;  "age": 25&#10;}'
                  rows={25}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 输出区域 */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Code className="w-5 h-5" />
                  <span>处理结果</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyOutput}
                  disabled={!outputJson}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
              </CardTitle>
              <CardDescription>
                格式化或压缩后的JSON结果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outputJson ? (
                <div className="space-y-4">
                  {/* <Label htmlFor="output-json">处理结果：</Label> */}
                  <Textarea
                    id="output-json"
                    value={outputJson}
                    readOnly
                    rows={25}
                    className="resize-none font-mono text-sm bg-slate-50 border-slate-200"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                  <FileJson className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium mb-2">等待处理</p>
                  <p className="text-sm text-center">
                    请输入JSON数据并点击相应的操作按钮
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-slate-800">功能介绍：</h4>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span><strong>格式化：</strong>将压缩的JSON格式化为易读的格式</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span><strong>压缩：</strong>移除空格和换行，压缩JSON体积</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span><strong>验证：</strong>检查JSON语法是否正确</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span><strong>复制：</strong>一键复制输入或输出内容</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-slate-800">使用技巧：</h4>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span>可以调整缩进大小（1-8个空格）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span>点击"使用示例"可以快速体验功能</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span>支持复杂嵌套的JSON结构</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-medium text-slate-800">•</span>
                  <span>实时显示验证状态和错误信息</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 