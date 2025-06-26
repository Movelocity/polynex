#!/usr/bin/env python3
"""
代理配置格式迁移脚本

将AI供应商配置表中的代理配置从旧格式转换为新格式：
- 旧格式: {"host": "127.0.0.1", "port": 7890, "username": "user", "password": "pass"}
- 新格式: {"url": "http://127.0.0.1:7890", "username": "user", "password": "pass"}
"""

import sys
import os
import json
import sqlite3
from urllib.parse import urlparse

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

def migrate_proxy_config_format():
    """迁移代理配置格式"""
    db_path = os.path.join(project_root, "blog_platform.db")
    
    if not os.path.exists(db_path):
        print("数据库文件不存在，跳过迁移")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 获取所有有代理配置的记录
        cursor.execute("""
            SELECT id, name, proxy 
            FROM ai_provider_configs 
            WHERE proxy IS NOT NULL AND proxy != 'null' AND proxy != ''
        """)
        
        records = cursor.fetchall()
        
        if not records:
            print("没有需要迁移的代理配置")
            return
        
        updated_count = 0
        
        for record_id, name, proxy_json in records:
            try:
                # 解析现有的代理配置
                proxy_config = json.loads(proxy_json) if proxy_json else {}
                
                # 检查是否是旧格式（包含host和port字段）
                if 'host' in proxy_config and 'port' in proxy_config:
                    host = proxy_config.get('host', '')
                    port = proxy_config.get('port', '')
                    username = proxy_config.get('username', '')
                    password = proxy_config.get('password', '')
                    
                    # 构建新的URL格式
                    # 默认使用http协议，用户可以后续手动修改为https或其他协议
                    if host and port:
                        url = f"http://{host}:{port}"
                    elif host:
                        url = f"http://{host}"
                    else:
                        url = ""
                    
                    # 创建新的代理配置
                    new_proxy_config = {
                        "url": url,
                        "username": username,
                        "password": password
                    }
                    
                    # 更新数据库记录
                    new_proxy_json = json.dumps(new_proxy_config, ensure_ascii=False)
                    cursor.execute("""
                        UPDATE ai_provider_configs 
                        SET proxy = ? 
                        WHERE id = ?
                    """, (new_proxy_json, record_id))
                    
                    updated_count += 1
                    print(f"已更新供应商 '{name}' 的代理配置: {host}:{port} -> {url}")
                
                elif 'url' in proxy_config:
                    # 已经是新格式，跳过
                    print(f"供应商 '{name}' 的代理配置已经是新格式，跳过")
                
                else:
                    print(f"供应商 '{name}' 的代理配置格式无法识别，跳过: {proxy_json}")
                
            except json.JSONDecodeError as e:
                print(f"解析供应商 '{name}' 的代理配置JSON失败: {e}")
                continue
            except Exception as e:
                print(f"处理供应商 '{name}' 的代理配置时出错: {e}")
                continue
        
        # 提交更改
        conn.commit()
        print(f"\n迁移完成！共更新了 {updated_count} 个代理配置")
        
        if updated_count > 0:
            print("\n注意事项：")
            print("1. 迁移脚本默认使用 http:// 协议")
            print("2. 如果您的代理需要 https:// 或其他协议，请在管理界面手动修改")
            print("3. 请测试代理配置是否正常工作")
        
    except Exception as e:
        print(f"迁移过程中出错: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

def rollback_proxy_config_format():
    """回滚代理配置格式（仅用于测试）"""
    print("警告：此操作将回滚代理配置格式，可能会丢失URL中的协议信息")
    
    confirm = input("确定要继续吗？(yes/no): ")
    if confirm.lower() != 'yes':
        print("操作已取消")
        return
    
    db_path = os.path.join(project_root, "blog_platform.db")
    
    if not os.path.exists(db_path):
        print("数据库文件不存在")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 获取所有有代理配置的记录
        cursor.execute("""
            SELECT id, name, proxy 
            FROM ai_provider_configs 
            WHERE proxy IS NOT NULL AND proxy != 'null' AND proxy != ''
        """)
        
        records = cursor.fetchall()
        
        if not records:
            print("没有需要回滚的代理配置")
            return
        
        updated_count = 0
        
        for record_id, name, proxy_json in records:
            try:
                # 解析现有的代理配置
                proxy_config = json.loads(proxy_json) if proxy_json else {}
                
                # 检查是否是新格式（包含url字段）
                if 'url' in proxy_config:
                    url = proxy_config.get('url', '')
                    username = proxy_config.get('username', '')
                    password = proxy_config.get('password', '')
                    
                    # 解析URL获取host和port
                    host = ''
                    port = ''
                    
                    if url:
                        try:
                            parsed = urlparse(url)
                            host = parsed.hostname or ''
                            port = parsed.port or ''
                        except Exception as e:
                            print(f"解析URL失败 '{url}': {e}")
                            # 尝试简单解析
                            if '://' in url:
                                url_without_protocol = url.split('://', 1)[1]
                            else:
                                url_without_protocol = url
                            
                            if ':' in url_without_protocol:
                                host, port_str = url_without_protocol.split(':', 1)
                                try:
                                    port = int(port_str)
                                except ValueError:
                                    port = ''
                            else:
                                host = url_without_protocol
                    
                    # 创建旧的代理配置
                    old_proxy_config = {
                        "host": host,
                        "port": port,
                        "username": username,
                        "password": password
                    }
                    
                    # 更新数据库记录
                    old_proxy_json = json.dumps(old_proxy_config, ensure_ascii=False)
                    cursor.execute("""
                        UPDATE ai_provider_configs 
                        SET proxy = ? 
                        WHERE id = ?
                    """, (old_proxy_json, record_id))
                    
                    updated_count += 1
                    print(f"已回滚供应商 '{name}' 的代理配置: {url} -> {host}:{port}")
                
            except json.JSONDecodeError as e:
                print(f"解析供应商 '{name}' 的代理配置JSON失败: {e}")
                continue
            except Exception as e:
                print(f"处理供应商 '{name}' 的代理配置时出错: {e}")
                continue
        
        # 提交更改
        conn.commit()
        print(f"\n回滚完成！共更新了 {updated_count} 个代理配置")
        
    except Exception as e:
        print(f"回滚过程中出错: {e}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="代理配置格式迁移脚本")
    parser.add_argument("--rollback", action="store_true", help="回滚代理配置格式")
    
    args = parser.parse_args()
    
    if args.rollback:
        rollback_proxy_config_format()
    else:
        migrate_proxy_config_format() 