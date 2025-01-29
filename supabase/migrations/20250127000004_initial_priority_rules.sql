-- Insert initial priority rules
INSERT INTO priority_rules (
    name,
    description,
    rules,
    is_active
) VALUES 
(
    'Urgency Analysis',
    'Determine priority based on urgency and time sensitivity',
    '{
        "rules": [
            {
                "description": "If the request is about current day weather or immediate travel plans, set priority to HIGH",
                "priority": "HIGH"
            },
            {
                "description": "If the customer needs information for an event or travel happening within 24 hours, set priority to CRITICAL",
                "priority": "CRITICAL"
            }
        ]
    }'::jsonb,
    true
),
(
    'Emotional Context',
    'Adjust priority based on customer emotional state',
    '{
        "rules": [
            {
                "description": "If the customer appears frustrated or disappointed, set priority to HIGH",
                "priority": "HIGH"
            },
            {
                "description": "If the customer is clearly angry or extremely upset, set priority to CRITICAL",
                "priority": "CRITICAL"
            }
        ]
    }'::jsonb,
    true
),
(
    'Issue Impact',
    'Set priority based on the scope and impact of the issue',
    '{
        "rules": [
            {
                "description": "If the issue affects multiple people or a group activity, set priority to HIGH",
                "priority": "HIGH"
            },
            {
                "description": "If the issue involves safety concerns or potential dangers, set priority to CRITICAL",
                "priority": "CRITICAL"
            },
            {
                "description": "If the issue involves lost belongings or documentation, set priority to HIGH",
                "priority": "HIGH"
            }
        ]
    }'::jsonb,
    true
); 