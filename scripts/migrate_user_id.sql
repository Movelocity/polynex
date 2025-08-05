-- 添加 user_id 字段到 conversation 表
ALTER TABLE conversation ADD COLUMN user_id VARCHAR;

-- 从 conversations 表复制 user_id 数据到 conversation 表
-- 注意：这里假设 conversations 表的 id 对应 conversation 表的 conv_id
UPDATE conversation
SET user_id = (
    SELECT user_id 
    FROM conversations 
    WHERE conversations.id = conversation.conv_id
);

-- 设置 user_id 为非空约束
ALTER TABLE conversation ALTER COLUMN user_id SET NOT NULL;