-- ====================================================================
-- Expert Decision Replay Platform - Sample Test Data for pgAdmin 4
-- Execute this in pgAdmin 4 Query Tool to insert realistic test records.
-- All user accounts have the default password: Pass1234
-- ====================================================================

-- 1. Insert 5 Initial Users
INSERT INTO users (id, full_name, email, role, employee_id, department, designation, phone_number, password)
VALUES 
(1, 'System Administrator', 'admin@example.com', 'Administrator', 'EMP-001', 'Executive', 'Chief Technology Officer', '+1-555-0101', '$2b$12$N6GlkiS5vgLPjUiiv.tsBeBPGX8ZYrMOsCwq54Sr4cnMJ/shM8JcC'),
(2, 'Sarah Connor', 'manager@example.com', 'Manager', 'EMP-002', 'Engineering', 'Engineering Director', '+1-555-0102', '$2b$12$N6GlkiS5vgLPjUiiv.tsBeBPGX8ZYrMOsCwq54Sr4cnMJ/shM8JcC'),
(3, 'David Chen', 'reviewer@example.com', 'Reviewer', 'EMP-003', 'Architecture', 'Principal Architect', '+1-555-0103', '$2b$12$N6GlkiS5vgLPjUiiv.tsBeBPGX8ZYrMOsCwq54Sr4cnMJ/shM8JcC'),
(4, 'Alice Smith', 'employee@example.com', 'Employee', 'EMP-004', 'Engineering', 'Senior Backend Engineer', '+1-555-0104', '$2b$12$N6GlkiS5vgLPjUiiv.tsBeBPGX8ZYrMOsCwq54Sr4cnMJ/shM8JcC'),
(5, 'Robert Vance', 'robert@example.com', 'Employee', 'EMP-005', 'Infrastructure', 'DevOps Specialist', '+1-555-0105', '$2b$12$N6GlkiS5vgLPjUiiv.tsBeBPGX8ZYrMOsCwq54Sr4cnMJ/shM8JcC')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    employee_id = EXCLUDED.employee_id,
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    phone_number = EXCLUDED.phone_number,
    password = EXCLUDED.password;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. Insert Teams
INSERT INTO teams (id, name, department, created_at)
VALUES 
(1, 'Core Platform Team', 'Engineering', CURRENT_TIMESTAMP),
(2, 'Architecture Review Board', 'Architecture', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department;

SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));

-- 3. Insert Team Members
INSERT INTO team_members (team_id, user_id, joined_at)
VALUES 
(1, 2, CURRENT_TIMESTAMP),
(1, 4, CURRENT_TIMESTAMP),
(1, 5, CURRENT_TIMESTAMP),
(2, 1, CURRENT_TIMESTAMP),
(2, 3, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 4. Insert Tags
INSERT INTO tags (id, name, created_at)
VALUES 
(1, 'PostgreSQL', CURRENT_TIMESTAMP),
(2, 'Database', CURRENT_TIMESTAMP),
(3, 'Architecture', CURRENT_TIMESTAMP),
(4, 'Cloud', CURRENT_TIMESTAMP),
(5, 'Performance', CURRENT_TIMESTAMP),
(6, 'Security', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags));

-- 5. Insert Decisions
INSERT INTO decisions (id, title, problem_statement, category, status, rationale, created_by)
VALUES 
(1, 'Migrate Primary Datastore to PostgreSQL', 'Our current legacy document store is causing data inconsistency in high-frequency multi-table financial calculations. We need an ACID-compliant, enterprise-grade relational database.', 'Technology', 'Approved', 'PostgreSQL provides robust transactional integrity, strong JSONB capabilities, and excellent ecosystem support for our growing platform.', 4),
(2, 'Adopt Hybrid Kubernetes Deployment Strategy', 'Evaluate moving microservices from raw virtual machines to managed Kubernetes clusters for improved autoscaling and fault isolation.', 'Infrastructure', 'Under Review', NULL, 4),
(3, 'Zero Trust Network Architecture for Internal APIs', 'Design and implement strict mTLS and short-lived JWT token validation across internal microservices.', 'Security', 'Draft', NULL, 5)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    problem_statement = EXCLUDED.problem_statement,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    rationale = EXCLUDED.rationale;

SELECT setval('decisions_id_seq', (SELECT MAX(id) FROM decisions));

-- 6. Associate Tags to Decisions
INSERT INTO decision_tags (decision_id, tag_id)
VALUES 
(1, 1),
(1, 2),
(1, 3),
(2, 4),
(2, 5),
(3, 6)
ON CONFLICT DO NOTHING;

-- 7. Insert Alternatives for Decision 1
INSERT INTO alternatives (decision_id, name, description, pros, cons, estimated_cost, feasibility_score, risk_level)
VALUES 
(1, 'PostgreSQL 16 Enterprise', 'Deploy managed PostgreSQL on enterprise cloud with automated read replicas and point-in-time recovery.', 'Rock-solid ACID transactions, advanced indexing, native JSONB, strong community.', 'Requires structured migrations and capacity planning.', 4500, 5, 'Low'),
(1, 'MySQL 8.0 Cluster', 'Deploy clustered MySQL with Group Replication.', 'Mature ecosystem, wide talent availability, simple setup.', 'Less flexible JSON operations and weaker complex analytical joins.', 4200, 4, 'Medium'),
(1, 'MongoDB Atlas Dedicated', 'Continue using NoSQL document store with dedicated sharded cluster.', 'No upfront schema migrations, rapid early prototyping.', 'Lacks native declarative multi-collection relational constraints and causes consistency overhead.', 6800, 3, 'High')
ON CONFLICT DO NOTHING;

-- 8. Insert Discussion Threads
INSERT INTO discussion_threads (id, decision_id, created_by, title, description, status)
VALUES 
(1, 1, 4, 'Query Performance under 50k QPS', 'Let us discuss indexing strategies (e.g. partial indexes and BRIN) before committing to production sizing.', 'open')
ON CONFLICT (id) DO NOTHING;

SELECT setval('discussion_threads_id_seq', (SELECT MAX(id) FROM discussion_threads));

-- 9. Insert Comments
INSERT INTO comments (decision_id, thread_id, user_id, content)
VALUES 
(1, 1, 3, 'Tested PostgreSQL with pgbench: sustained 75k QPS with sub-5ms p99 latency on a 16 vCPU instance.'),
(1, 1, 4, 'That exceeds our SLA requirement. Concur with selecting PostgreSQL.')
ON CONFLICT DO NOTHING;

-- 10. Insert Approvals
INSERT INTO approvals (decision_id, reviewer_id, approval_level, status, comments, assigned_at)
VALUES 
(1, 3, 1, 'Approved', 'Architecture and performance benchmarks meet all requirements.', CURRENT_TIMESTAMP),
(1, 2, 2, 'Approved', 'Budget allocated. Ready for production rollout.', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 11. Insert Audit Logs
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
VALUES 
(4, 'CREATE', 'Decision', 1, 'Alice Smith created decision: Migrate Primary Datastore to PostgreSQL'),
(3, 'APPROVE', 'Approval', 1, 'David Chen approved level 1 architectural review'),
(2, 'APPROVE', 'Approval', 2, 'Sarah Connor approved level 2 managerial review')
ON CONFLICT DO NOTHING;
