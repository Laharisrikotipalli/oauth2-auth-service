CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  UNIQUE (provider, provider_user_id)
);

-- Admin user
INSERT INTO users (id, name, email, password_hash, role)
VALUES
(
  gen_random_uuid(),
  'Admin User',
  'admin@example.com',
  '$2b$10$xSRTqZKU5TTzcYGGlKhJL..O5zq2.iikkgaK5A2lSq.FKUMnBY.GC',
  'admin'
),
(
  gen_random_uuid(),
  'Regular User',
  'user@example.com',
  '$2b$10$A9nYw2kPzYH7L9S1XKz9D8P...',
  'user'
);
