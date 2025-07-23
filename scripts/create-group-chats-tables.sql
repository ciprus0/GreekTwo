-- Create group_chats table
CREATE TABLE IF NOT EXISTS group_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_chat_members table
CREATE TABLE IF NOT EXISTS group_chat_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_chat_id, member_id)
);

-- Add group_chat_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES group_chats(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_chats_organization_id ON group_chats(organization_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_group_chat_id ON group_chat_members(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_member_id ON group_chat_members(member_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_chat_id ON messages(group_chat_id);
