-- Create mentions table to store @username and @everyone mentions
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mention_type TEXT NOT NULL CHECK (mention_type IN ('user', 'everyone')),
  source_type TEXT NOT NULL CHECK (source_type IN ('ticket', 'comment', 'chat')),
  source_id TEXT,
  source_title TEXT,
  content_snippet TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_mentions_mentioned_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_created_at ON public.mentions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Users can view mentions where they are mentioned or where mention_type is 'everyone'
CREATE POLICY "Users can view their own mentions"
ON public.mentions
FOR SELECT
USING (
  auth.uid() = mentioned_user_id 
  OR mention_type = 'everyone'
);

-- Users can create mentions (when they mention someone)
CREATE POLICY "Users can create mentions"
ON public.mentions
FOR INSERT
WITH CHECK (auth.uid() = mentioned_by_user_id);

-- Users can mark their mentions as read
CREATE POLICY "Users can update their own mentions"
ON public.mentions
FOR UPDATE
USING (auth.uid() = mentioned_user_id OR mention_type = 'everyone');

-- Enable realtime for mentions
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentions;