-- Add features column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "events": true,
  "study": true,
  "tasks": true,
  "library": true,
  "messages": true,
  "announcements": true,
  "pledgeSystem": true
}'::jsonb;

-- Update existing organizations to have default features
UPDATE organizations 
SET features = '{
  "events": true,
  "study": true,
  "tasks": true,
  "library": true,
  "messages": true,
  "announcements": true,
  "pledgeSystem": true
}'::jsonb
WHERE features IS NULL;

-- Update existing members to have "active" role if they don't have a specific role
UPDATE members 
SET role = 'active' 
WHERE role = 'member' OR role IS NULL;

-- Add pledge column to members table for tracking new member status
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT false;
