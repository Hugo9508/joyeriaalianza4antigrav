-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO anon;
GRANT ALL ON public.chat_sessions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon;
GRANT ALL ON public.chat_messages TO service_role;

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for public access (using session ID as the security token)
CREATE POLICY "Allow public select sessions" ON public.chat_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert sessions" ON public.chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update sessions" ON public.chat_sessions FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow public select messages" ON public.chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert messages" ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);
