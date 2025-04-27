-- Create user_balances table
CREATE TABLE IF NOT EXISTS user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    balance_amount TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, group_id)
);

-- Create user_balances_between_users table
CREATE TABLE IF NOT EXISTS user_balances_between_users (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    balance_amount TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (group_id, from_user_id, to_user_id)
);

-- Create indexes for balance tables
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances (user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_group_id ON user_balances (group_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_between_users_group_id ON user_balances_between_users (group_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_between_users_from_user_id ON user_balances_between_users (from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_between_users_to_user_id ON user_balances_between_users (to_user_id);