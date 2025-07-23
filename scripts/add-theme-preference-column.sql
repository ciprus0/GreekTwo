-- Add theme_preference column to members table
ALTER TABLE members 
ADD COLUMN theme_preference VARCHAR(20) DEFAULT 'dark';

-- Add check constraint to ensure valid theme values
ALTER TABLE members 
ADD CONSTRAINT check_theme_preference 
CHECK (theme_preference IN ('original', 'dark', 'light'));

-- Update existing members to have default theme
UPDATE members 
SET theme_preference = 'dark' 
WHERE theme_preference IS NULL;
