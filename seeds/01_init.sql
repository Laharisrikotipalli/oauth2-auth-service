-- 1️⃣ Enable UUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2️⃣ USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3️⃣ AUTH PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  UNIQUE (provider, provider_user_id)
);

-- 4️⃣ SEED USERS (password = AdminPassword123!)
INSERT INTO users (email, name, role, password_hash)
VALUES
(
  'admin@example.com',
  'Admin',
  'admin',
  '$2b$10$N9qo8uLOickgx2ZMRZo5i.ej5YbC0q9pU8dQyOqGvYvYyVt2aZK7W'
),
(
  'user@example.com',
  'User',
  'user',
  '$2b$10$N9qo8uLOickgx2ZMRZo5i.ej5YbC0q9pU8dQyOqGvYvYyVt2aZK7W'
);
