-- Insert Zain AI user with Administrator role
INSERT INTO users (
    id,
    email,
    role,
    name,
    created_at
) VALUES (
    'a1b2c3d4-e5f6-4567-8901-abcdef123456',  -- Fixed UUID for consistent reference
    'zain.ai@zenzen.internal',
    'Administrator',
    'Zain',
    now()
) ON CONFLICT (email) DO NOTHING;  -- Prevent duplicate insertion if migration is rerun 