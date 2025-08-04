-- 验证迁移结果的SQL查询

-- 检查消息总数
SELECT COUNT(*) AS total_messages FROM messages;

-- 检查包含消息的对话数
SELECT COUNT(*) AS conversations_with_messages FROM (
    SELECT conv_id, COUNT(*) FROM messages GROUP BY conv_id
) AS subquery;

-- 检查每个对话的消息数量
SELECT conv_id, COUNT(*) AS message_count 
FROM messages 
GROUP BY conv_id 
ORDER BY message_count DESC;

-- 检查不同角色的消息分布
SELECT role, COUNT(*) AS count 
FROM messages 
GROUP BY role;

-- 检查消息时间戳是否正确排序（每个对话内）
SELECT m1.conv_id, m1.msg_id, m1.create_time, m2.msg_id, m2.create_time
FROM messages m1
JOIN messages m2 ON m1.conv_id = m2.conv_id
WHERE m1.create_time > m2.create_time
  AND m1.rowid < m2.rowid
LIMIT 10;

-- 检查是否所有消息都设置了active状态
SELECT COUNT(*) AS non_active_messages
FROM messages
WHERE status != 'active';

-- 检查是否所有消息的创建时间和更新时间一致
SELECT COUNT(*) AS inconsistent_timestamps
FROM messages
WHERE create_time != update_time;

-- 检查消息时间是否在对话的创建和更新时间范围内
SELECT m.msg_id, m.create_time, c.create_time, c.update_time
FROM messages m
JOIN conversations c ON m.conv_id = c.id
WHERE m.create_time < c.create_time OR m.create_time > c.update_time
LIMIT 10;