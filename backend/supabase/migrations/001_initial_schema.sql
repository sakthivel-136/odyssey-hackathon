-- 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DEVICES TABLE
CREATE TABLE public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) UNIQUE NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_model VARCHAR(100),
    compartment_count INTEGER NOT NULL DEFAULT 3,
    pairing_status VARCHAR(50) DEFAULT 'UNPAIRED',
    pairing_token VARCHAR(255),
    device_status VARCHAR(50) DEFAULT 'OFFLINE',
    firmware_version VARCHAR(50),
    mqtt_client_id VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DEVICE_USERS TABLE (For ownership and auth)
CREATE TABLE public.device_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id) in Supabase
    role VARCHAR(50) DEFAULT 'OWNER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, user_id)
);

-- COMPARTMENTS TABLE
CREATE TABLE public.compartments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    compartment_number INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'CLOSED',
    servo_status VARCHAR(50) DEFAULT 'UNKNOWN',
    ir_status VARCHAR(50) DEFAULT 'UNKNOWN',
    current_state VARCHAR(50) DEFAULT 'IDLE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, compartment_number)
);

-- MEDICINES TABLE
CREATE TABLE public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    strength VARCHAR(100),
    dosage_form VARCHAR(100),
    dose_quantity INTEGER DEFAULT 1,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    instructions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEDICINE_COMPARTMENTS (Assignment)
CREATE TABLE public.medicine_compartments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compartment_id UUID REFERENCES public.compartments(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    current_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(compartment_id)
);

-- SCHEDULES TABLE
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    schedule_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SCHEDULE_ITEMS TABLE (For multi-compartment doses)
CREATE TABLE public.schedule_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    compartment_id UUID REFERENCES public.compartments(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    dose_quantity INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(schedule_id, step_order)
);

-- DEVICE_COMMANDS
CREATE TABLE public.device_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    command_id VARCHAR(100) UNIQUE NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    user_id UUID,
    command_type VARCHAR(100) NOT NULL,
    compartment_id UUID REFERENCES public.compartments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- DOSE_EVENTS (History)
CREATE TABLE public.dose_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    compartment_id UUID REFERENCES public.compartments(id) ON DELETE SET NULL,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
    event_date DATE NOT NULL,
    scheduled_time TIME,
    taken_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL, -- COMPLETED, MISSED, PARTIAL
    dose_quantity INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Basic templates
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_events ENABLE ROW LEVEL SECURITY;

-- Set up realtime publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compartments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dose_events;

-- SENSOR_EVENTS TABLE
CREATE TABLE public.sensor_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) UNIQUE NOT NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    compartment_id UUID REFERENCES public.compartments(id) ON DELETE SET NULL,
    sensor_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    raw_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- DEVICE_TELEMETRY TABLE
CREATE TABLE public.device_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    uptime_seconds INTEGER,
    wifi_rssi INTEGER,
    firmware_version VARCHAR(50),
    sensor_status JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT_LOGS TABLE
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    device_id UUID,
    action VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI_INSIGHTS TABLE
CREATE TABLE public.ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    relevance_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sensor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_events;
