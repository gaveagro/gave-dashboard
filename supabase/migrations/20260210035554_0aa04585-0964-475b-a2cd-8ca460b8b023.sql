
-- Add estimated harvest columns to land_leases
ALTER TABLE public.land_leases
ADD COLUMN estimated_harvest_month INTEGER,
ADD COLUMN estimated_harvest_year INTEGER;

-- Add check constraint for month range
ALTER TABLE public.land_leases
ADD CONSTRAINT chk_harvest_month CHECK (estimated_harvest_month IS NULL OR (estimated_harvest_month >= 1 AND estimated_harvest_month <= 12));

-- Create lease_comments table
CREATE TABLE public.lease_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.land_leases(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lease_comments ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage all lease comments"
ON public.lease_comments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
