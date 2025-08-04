#!/usr/bin/env python3
import os
import sys
import subprocess
import argparse
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description='运行消息迁移脚本')
    parser.add_argument('db_path', help='SQLite数据库文件路径')
    parser.add_argument('--backup', action='store_true', help='在迁移前备份数据库')
    args = parser.parse_args()
    
    db_path = os.path.abspath(args.db_path)
    
    # 检查数据库文件是否存在
    if not os.path.exists(db_path):
        print(f"错误: 数据库文件 '{db_path}' 不存在")
        return 1
    
    # 备份数据库
    if args.backup:
        backup_path = f"{db_path}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
        print(f"备份数据库到: {backup_path}")
        try:
            with open(db_path, 'rb') as src, open(backup_path, 'wb') as dst:
                dst.write(src.read())
        except Exception as e:
            print(f"备份数据库失败: {str(e)}")
            return 1
    
    # 运行迁移脚本
    migration_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                   "migrate_conversations_to_messages.py")
    
    print(f"运行迁移脚本: {migration_script}")
    print(f"数据库路径: {db_path}")
    
    try:
        subprocess.run([sys.executable, migration_script, db_path], check=True)
        print("迁移成功完成!")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"迁移失败: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())