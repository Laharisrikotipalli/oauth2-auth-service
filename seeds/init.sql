-- 1. Enable UUID (Requirement 3)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the Users table (MUST come before INSERT)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create the Auth Providers table
CREATE TABLE IF NOT EXISTS auth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    UNIQUE(provider, provider_user_id)
);

-- 4. Seed Data (Requirement 4)
INSERT INTO users (name, email, password_hash, role) 
VALUES (
    'Admin User', 
    'admin@example.com', 
    '$2a$10$Y5vP9NlM/E7v8uXv2H.9O.u8H0R5O8R5O8R5O8R5O8R5O8R5O8R5O', 
    'admin'
) ON CONFLICT (email) DO NOTHING;
INSERT INTO users (name, email, password_hash, role) 
VALUES ('Regular User', 'user@example.com', '$2a$10$Y5vP9NlM/E7v8uXv2H.9O.u8H0R5O8R5O8R5O8R5O8R5O8R5O8R5O', 'user')
ON CONFLICT (email) DO NOTHING;