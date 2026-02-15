import { useSignedUrl } from "@/hooks/useSignedUrl";

interface SignedImageProps {
  storagePath: string | null;
  alt: string;
  className?: string;
}

/**
 * Renders an image from a private Supabase storage bucket using a signed URL.
 * Handles legacy full URLs gracefully.
 */
const SignedImage = ({ storagePath, alt, className }: SignedImageProps) => {
  const url = useSignedUrl(storagePath);

  if (!url) return null;

  return <img src={url} alt={alt} className={className} />;
};

export default SignedImage;
