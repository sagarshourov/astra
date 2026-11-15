CREATE DATABASE IF NOT EXISTS astra_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE astra_ai;

CREATE TABLE IF NOT EXISTS users (
 id CHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conversations (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL,
 title VARCHAR(160) NOT NULL DEFAULT 'New conversation',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_conversations_user (user_id, updated_at),
 CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS messages (
 id CHAR(36) PRIMARY KEY, conversation_id CHAR(36) NOT NULL,
 role ENUM('user','assistant') NOT NULL,
 content TEXT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_messages_conversation (conversation_id, created_at),
 CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS daily_usage (
 user_id CHAR(36) NOT NULL,
 usage_date DATE NOT NULL,
 requests_count INT UNSIGNED NOT NULL DEFAULT 0,
 PRIMARY KEY (user_id, usage_date),
 CONSTRAINT fk_daily_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS auth_attempts (
 identifier_hash CHAR(64) PRIMARY KEY,
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 window_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
