-- Update members table to use roles array and remove old role column
-- This script ensures Group Owner has proper admin permissions

-- First, let's update any existing data to use the new roles array format
UPDATE members 
SET roles = CASE 
  WHEN role = 'admin' THEN '["Group Owner"]'::jsonb
  WHEN role = 'executive' THEN '["President"]'::jsonb
  WHEN role = 'treasurer' THEN '["Treasurer"]'::jsonb
  WHEN role = 'active' THEN '["Active"]'::jsonb
  WHEN role = 'new_member' THEN '["New Member"]'::jsonb
  ELSE '["New Member"]'::jsonb
END
WHERE roles IS NULL OR roles = '[]'::jsonb;

-- Update organizations to have proper default roles with correct admin permissions
UPDATE organizations 
SET roles = '[
  {
    "id": "group_owner",
    "name": "Group Owner", 
    "color": "#7c3aed",
    "isDefault": true,
    "isAdmin": true
  },
  {
    "id": "president",
    "name": "President",
    "color": "#dc2626", 
    "isDefault": true,
    "isAdmin": true
  },
  {
    "id": "treasurer", 
    "name": "Treasurer",
    "color": "#059669",
    "isDefault": true,
    "isAdmin": true
  },
  {
    "id": "active",
    "name": "Active",
    "color": "#2563eb",
    "isDefault": true, 
    "isAdmin": false
  },
  {
    "id": "new_member",
    "name": "New Member",
    "color": "#f59e0b",
    "isDefault": true,
    "isAdmin": false
  }
]'::jsonb
WHERE roles IS NULL OR jsonb_array_length(roles) = 0;

-- Ensure organization creators have Group Owner role
UPDATE members 
SET roles = '["Group Owner"]'::jsonb,
    approved = true
WHERE id IN (
  SELECT created_by 
  FROM organizations 
  WHERE created_by IS NOT NULL
);

-- Auto-approve all Group Owners, Presidents, and Treasurers
UPDATE members 
SET approved = true 
WHERE roles::text LIKE '%Group Owner%' 
   OR roles::text LIKE '%President%' 
   OR roles::text LIKE '%Treasurer%';

-- Drop the old role column if it exists (commented out for safety)
-- ALTER TABLE members DROP COLUMN IF EXISTS role;

-- Add index on roles for better performance
CREATE INDEX IF NOT EXISTS idx_members_roles ON members USING GIN (roles);

-- Add index on organization roles
CREATE INDEX IF NOT EXISTS idx_organizations_roles ON organizations USING GIN (roles);
