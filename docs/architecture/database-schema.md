# Database Schema
SQL

-- Users Table: Stores user account information.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integrations Table: Stores connections to external services for each user.
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- e.g., 'MSTODO', 'CONNECTWISE'
    credentials JSONB NOT NULL, -- Encrypted tokens
    status TEXT NOT NULL, -- e.g., 'ACTIVE', 'ERROR'
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);