-- Add delivery_proof_url column to orders table for rider proof-of-delivery photos

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;

-- Create storage bucket for delivery proof photos if it doesn't exist
-- (This needs to also be done via Supabase Dashboard or API)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('delivery_proofs', 'delivery_proofs', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated riders to upload to delivery_proofs bucket
CREATE POLICY "Riders can upload delivery proof photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery_proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view delivery proof photos
CREATE POLICY "Anyone can view delivery proof photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'delivery_proofs');
