-- Add phone_number and major fields to members table
ALTER TABLE members 
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN major VARCHAR(100);
