-- 创建messages表
CREATE TABLE IF NOT EXISTS messages (
    msg_id VARCHAR PRIMARY KEY,
    conv_id VARCHAR NOT NULL,
    role VARCHAR(100) NOT NULL,  -- user | assistant | admin
    sender VARCHAR(100) NOT NULL,  -- user_id | agent_id
    type VARCHAR(100) NOT NULL,  -- text | summary | image | audio | file | any
    status VARCHAR(100) NOT NULL,  -- active | send failed | deleted
    content TEXT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation
        FOREIGN KEY(conv_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_messages_conv_id ON messages(conv_id);
CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_messages_create_time ON messages(create_time);