-- 003_create_auth_tables.sql
-- NBA Database - Authentication and Dashboard Tables
-- Run this after 002_create_indexes.sql to add user management functionality

BEGIN;

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_username_check CHECK (LENGTH(username) >= 3),
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions/refresh tokens table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT user_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Dashboards table
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, name),
    
    -- Foreign key constraint
    CONSTRAINT dashboards_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Saved reports table
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Report configuration
    measure VARCHAR(10) NOT NULL CHECK (measure IN ('Players', 'Teams')),
    filters JSONB NOT NULL DEFAULT '[]',
    sort_config JSONB DEFAULT '{"column": null, "direction": "desc"}',
    view_type VARCHAR(20) DEFAULT 'traditional' CHECK (view_type IN ('traditional', 'advanced', 'custom', 'unified')),
    
    -- Cached data (optional - can be NULL to always regenerate)
    cached_results JSONB,
    cached_metadata JSONB,
    cache_expires_at TIMESTAMP,
    
    -- Report metadata
    is_favorite BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(dashboard_id, name),
    
    -- Foreign key constraints
    CONSTRAINT saved_reports_dashboard_id_fkey 
        FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
    CONSTRAINT saved_reports_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Report sharing table (for future use)
CREATE TABLE report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL,
    shared_by_user_id UUID NOT NULL,
    shared_with_user_id UUID,
    share_token UUID DEFAULT gen_random_uuid(),
    is_public BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT report_shares_report_id_fkey 
        FOREIGN KEY (report_id) REFERENCES saved_reports(id) ON DELETE CASCADE,
    CONSTRAINT report_shares_shared_by_user_id_fkey 
        FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT report_shares_shared_with_user_id_fkey 
        FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active);

-- Dashboards indexes
CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX idx_dashboards_user_default ON dashboards(user_id, is_default);
CREATE INDEX idx_dashboards_name ON dashboards(name);
CREATE INDEX idx_dashboards_created_at ON dashboards(created_at);

-- Saved reports indexes
CREATE INDEX idx_saved_reports_dashboard_id ON saved_reports(dashboard_id);
CREATE INDEX idx_saved_reports_user_id ON saved_reports(user_id);
CREATE INDEX idx_saved_reports_measure ON saved_reports(measure);
CREATE INDEX idx_saved_reports_favorite ON saved_reports(is_favorite);
CREATE INDEX idx_saved_reports_created_at ON saved_reports(created_at);
CREATE INDEX idx_saved_reports_last_viewed ON saved_reports(last_viewed_at);
CREATE INDEX idx_saved_reports_cache_expires ON saved_reports(cache_expires_at);
CREATE INDEX idx_saved_reports_user_dashboard ON saved_reports(user_id, dashboard_id);

-- Report shares indexes
CREATE INDEX idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX idx_report_shares_shared_by ON report_shares(shared_by_user_id);
CREATE INDEX idx_report_shares_shared_with ON report_shares(shared_with_user_id);
CREATE INDEX idx_report_shares_token ON report_shares(share_token);
CREATE INDEX idx_report_shares_public ON report_shares(is_public);
CREATE INDEX idx_report_shares_expires ON report_shares(expires_at);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =====================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to auto-update updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at 
    BEFORE UPDATE ON dashboards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_reports_updated_at 
    BEFORE UPDATE ON saved_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONSTRAINTS AND POLICIES
-- =====================================================

-- Ensure only one default dashboard per user
CREATE UNIQUE INDEX idx_users_default_dashboard 
ON dashboards(user_id) 
WHERE is_default = TRUE;

-- Constraint to ensure cache expiry is in the future
ALTER TABLE saved_reports ADD CONSTRAINT check_cache_expires_future 
CHECK (cache_expires_at IS NULL OR cache_expires_at > created_at);

-- Constraint to ensure session expiry is in the future
ALTER TABLE user_sessions ADD CONSTRAINT check_session_expires_future 
CHECK (expires_at > created_at);

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- User profile view (excludes sensitive data)
CREATE VIEW user_profiles AS
SELECT 
    id,
    username,
    email,
    first_name,
    last_name,
    is_active,
    email_verified,
    last_login,
    created_at,
    updated_at
FROM users
WHERE is_active = TRUE;

-- Dashboard summary view
CREATE VIEW dashboard_summary AS
SELECT 
    d.id,
    d.user_id,
    d.name,
    d.description,
    d.is_default,
    d.created_at,
    d.updated_at,
    COUNT(sr.id) as report_count,
    COUNT(CASE WHEN sr.is_favorite = TRUE THEN 1 END) as favorite_count,
    MAX(sr.last_viewed_at) as last_activity
FROM dashboards d
LEFT JOIN saved_reports sr ON d.id = sr.dashboard_id
GROUP BY d.id, d.user_id, d.name, d.description, d.is_default, d.created_at, d.updated_at;

-- Recent reports view
CREATE VIEW recent_reports AS
SELECT 
    sr.id,
    sr.dashboard_id,
    sr.user_id,
    sr.name,
    sr.measure,
    sr.view_type,
    sr.is_favorite,
    sr.view_count,
    sr.last_viewed_at,
    sr.created_at,
    d.name as dashboard_name,
    u.username
FROM saved_reports sr
JOIN dashboards d ON sr.dashboard_id = d.id
JOIN users u ON sr.user_id = u.id
WHERE sr.last_viewed_at IS NOT NULL
ORDER BY sr.last_viewed_at DESC;

-- =====================================================
-- SAMPLE DATA (FOR DEVELOPMENT)
-- =====================================================

-- Insert a sample user (password is 'password123' hashed with bcrypt)
-- Note: In production, this should be removed or use proper seeding scripts
INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
('demo_user', 'demo@nbaanalytics.com', '$2b$10$rOxcx5YiOeZjD8bEF8Qz4.TGGb8ZVJ6mJ1qQ8j5YKVMxUGvfVl8T2', 'Demo', 'User'),
('admin_user', 'admin@nbaanalytics.com', '$2b$10$rOxcx5YiOeZjD8bEF8Qz4.TGGb8ZVJ6mJ1qQ8j5YKVMxUGvfVl8T2', 'Admin', 'User');

-- Create sample dashboards
INSERT INTO dashboards (user_id, name, description, is_default) 
SELECT 
    u.id,
    'My NBA Analytics',
    'Default dashboard for NBA player and team analysis',
    true
FROM users u WHERE u.username = 'demo_user';

INSERT INTO dashboards (user_id, name, description) 
SELECT 
    u.id,
    'Advanced Analytics',
    'Dashboard focused on advanced NBA statistics',
    false
FROM users u WHERE u.username = 'demo_user';

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'User accounts for NBA Analytics platform';
COMMENT ON TABLE user_sessions IS 'Active user sessions with refresh tokens';
COMMENT ON TABLE dashboards IS 'User-created dashboards containing saved reports';
COMMENT ON TABLE saved_reports IS 'Saved NBA statistical reports with cached data';
COMMENT ON TABLE report_shares IS 'Report sharing permissions and public links';

COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'SHA256 hash of refresh token';
COMMENT ON COLUMN saved_reports.filters IS 'JSON array of filter configurations';
COMMENT ON COLUMN saved_reports.cached_results IS 'Cached query results to avoid re-computation';
COMMENT ON COLUMN saved_reports.cache_expires_at IS 'When cached data becomes stale';

COMMIT;

-- Verification
SELECT 'Authentication tables created successfully!' as status;

-- Count new tables created
SELECT 
    'Auth tables: ' || COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_sessions', 'dashboards', 'saved_reports', 'report_shares');

-- Show table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('users', 'user_sessions', 'dashboards', 'saved_reports')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;