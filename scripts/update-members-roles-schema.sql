-- First, let's see what we're working with and clean up the roles columns
-- Check which column is being used more frequently
SELECT 
  COUNT(*) as total_members,
  COUNT(role) as has_role_column,
  COUNT(roles) as has_roles_column
FROM members;

-- Update all members to use the roles array column consistently
-- Convert single role to roles array where roles is null
UPDATE members 
SET roles = CASE 
  WHEN roles IS NULL OR jsonb_array_length(roles) = 0 THEN 
    CASE 
      WHEN role IS NOT NULL THEN jsonb_build_array(role)
      ELSE jsonb_build_array('New Member')
    END
  ELSE roles
END;

-- Now we can safely drop the old role column since we're using roles array
ALTER TABLE members DROP COLUMN IF EXISTS role;

-- Add Group Owner role to default roles for all organizations
UPDATE organizations 
SET roles = COALESCE(roles, '[]'::jsonb) || '[
  {"id": "group_owner", "name": "Group Owner", "color": "#7c3aed", "isDefault": true, "isAdmin": true},
  {"id": "president", "name": "President", "color": "#dc2626", "isDefault": true, "isAdmin": true},
  {"id": "treasurer", "name": "Treasurer", "color": "#059669", "isDefault": true, "isAdmin": false},
  {"id": "active", "name": "Active", "color": "#2563eb", "isDefault": true, "isAdmin": false},
  {"id": "new_member", "name": "New Member", "color": "#f59e0b", "isDefault": true, "isAdmin": false}
]'::jsonb
WHERE roles IS NULL OR jsonb_array_length(roles) = 0;

-- Update existing organization creators to have Group Owner role
UPDATE members 
SET roles = jsonb_build_array('Group Owner')
WHERE id IN (
  SELECT created_by 
  FROM organizations 
  WHERE created_by IS NOT NULL
);
