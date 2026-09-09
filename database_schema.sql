-- ====================================================================
-- Expert Decision Replay Platform - Complete PostgreSQL Database Schema
-- Run this script in pgAdmin 4 (Query Tool) to create all tables and indexes.
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Employee', 'Reviewer', 'Manager', 'Administrator')),
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    designation VARCHAR(100),
    phone_number VARCHAR(20),
    password VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_employee_id ON users(employee_id);

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_teams_id ON teams(id);

-- 3. TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_team_members_id ON team_members(id);

-- 4. DECISIONS TABLE
CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    problem_statement TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' NOT NULL CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Rejected', 'Archived')),
    rationale TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_decisions_id ON decisions(id);
CREATE INDEX IF NOT EXISTS ix_decisions_category ON decisions(category);
CREATE INDEX IF NOT EXISTS ix_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS ix_decisions_created_by ON decisions(created_by);

-- 5. TAGS TABLE
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_tags_id ON tags(id);
CREATE INDEX IF NOT EXISTS ix_tags_name ON tags(name);

-- 6. DECISION_TAGS (Many-to-Many Association)
CREATE TABLE IF NOT EXISTS decision_tags (
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (decision_id, tag_id)
);

-- 7. ALTERNATIVES TABLE
CREATE TABLE IF NOT EXISTS alternatives (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    pros TEXT NOT NULL,
    cons TEXT NOT NULL,
    estimated_cost DOUBLE PRECISION NOT NULL,
    feasibility_score INTEGER NOT NULL CHECK (feasibility_score BETWEEN 1 AND 5),
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_alternatives_id ON alternatives(id);
CREATE INDEX IF NOT EXISTS ix_alternatives_decision_id ON alternatives(decision_id);

-- 8. DISCUSSION THREADS TABLE
CREATE TABLE IF NOT EXISTS discussion_threads (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_discussion_threads_id ON discussion_threads(id);
CREATE INDEX IF NOT EXISTS ix_discussion_threads_decision_id ON discussion_threads(decision_id);

-- 9. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    thread_id INTEGER REFERENCES discussion_threads(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_comments_id ON comments(id);
CREATE INDEX IF NOT EXISTS ix_comments_decision_id ON comments(decision_id);
CREATE INDEX IF NOT EXISTS ix_comments_thread_id ON comments(thread_id);

-- 10. MEETING NOTES TABLE
CREATE TABLE IF NOT EXISTS meeting_notes (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    meeting_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_meeting_notes_id ON meeting_notes(id);
CREATE INDEX IF NOT EXISTS ix_meeting_notes_decision_id ON meeting_notes(decision_id);

-- 11. DECISION VERSIONS TABLE
CREATE TABLE IF NOT EXISTS decision_versions (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_decision_versions_id ON decision_versions(id);
CREATE INDEX IF NOT EXISTS ix_decision_versions_decision_id ON decision_versions(decision_id);

-- 12. APPROVALS TABLE
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    approval_level INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    comments VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS ix_approvals_id ON approvals(id);
CREATE INDEX IF NOT EXISTS ix_approvals_decision_id ON approvals(decision_id);
CREATE INDEX IF NOT EXISTS ix_approvals_reviewer_id ON approvals(reviewer_id);

-- 13. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_activity_logs_id ON activity_logs(id);
CREATE INDEX IF NOT EXISTS ix_activity_logs_user_id ON activity_logs(user_id);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    description TEXT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(50),
    request_method VARCHAR(10),
    endpoint VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_id ON audit_logs(id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at);

-- 15. SECURITY LOGS TABLE
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    ip_address VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_security_logs_id ON security_logs(id);
CREATE INDEX IF NOT EXISTS ix_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS ix_security_logs_created_at ON security_logs(created_at);

-- 16. ACCESS LOGS TABLE
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    action VARCHAR(50),
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_access_logs_id ON access_logs(id);
CREATE INDEX IF NOT EXISTS ix_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_access_logs_resource_type ON access_logs(resource_type);
CREATE INDEX IF NOT EXISTS ix_access_logs_created_at ON access_logs(created_at);
