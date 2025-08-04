-- Create new conversation table and migrate data from conversations
-- This is a more compact version of the conversations table, focusing on essential metadata

-- 1. Create the new conversation table
CREATE TABLE IF NOT EXISTS conversation (
    conv_id VARCHAR PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '新对话',
    msg_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'active',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Migrate data from conversations table
INSERT INTO conversation (
    conv_id,
    title,
    msg_count,
    status,
    create_time,
    update_time
)
SELECT 
    c.id as conv_id,
    c.title,
    (SELECT COUNT(*) FROM messages m WHERE m.conv_id = c.id) as msg_count,
    c.status,
    c.create_time,
    c.update_time
FROM conversations c;

-- 3. Create indexes for better query performance
CREATE INDEX idx_conversation_status ON conversation(status);
CREATE INDEX idx_conversation_create_time ON conversation(create_time);
CREATE INDEX idx_conversation_update_time ON conversation(update_time);