-- Create gym_locations table
CREATE TABLE IF NOT EXISTS gym_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    radius INTEGER,
    is_box BOOLEAN DEFAULT FALSE,
    box_coordinates JSONB,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gym_sessions table
CREATE TABLE IF NOT EXISTS gym_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES gym_locations(id) ON DELETE CASCADE,
    location_name VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gym_locations_organization_id ON gym_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_user_id ON gym_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_organization_id ON gym_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_location_id ON gym_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_start_time ON gym_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_status ON gym_sessions(status);

-- Add RLS policies for gym_locations
ALTER TABLE gym_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gym locations in their organization" ON gym_locations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM members WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage gym locations in their organization" ON gym_locations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM members 
            WHERE id = auth.uid() 
            AND ('Group Owner' = ANY(roles) OR 'President' = ANY(roles) OR 'Treasurer' = ANY(roles))
        )
    );

-- Add RLS policies for gym_sessions
ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gym sessions" ON gym_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own gym sessions" ON gym_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own gym sessions" ON gym_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all gym sessions in their organization" ON gym_sessions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM members 
            WHERE id = auth.uid() 
            AND ('Group Owner' = ANY(roles) OR 'President' = ANY(roles) OR 'Treasurer' = ANY(roles))
        )
    );
