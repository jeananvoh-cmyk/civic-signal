import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const ShareButton = ({ title, text, url, className, variant = "outline", size = "sm" }: ShareButtonProps) => {
  const shareUrl = url || window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        toast.success("Lien copié dans le presse-papier !");
      } catch {
        toast.error("Impossible de partager");
      }
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleShare} className={className}>
      <Share2 className="h-4 w-4 mr-1.5" />
      Partager
    </Button>
  );
};

export default ShareButton;
