import { Share2 } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  ariaLabel?: string;
}

const ShareButton = ({ title, text, url, className, variant = "outline", size = "sm", ariaLabel }: ShareButtonProps) => {
  const shareUrl = url || window.location.href;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleWhatsApp = () => {
    const message = `${text}\n\n👉 ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      toast.success("Lien copié dans le presse-papier !");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} aria-label={ariaLabel ?? `Partager : ${title}`}>
          <Share2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Partager
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer">
          <WhatsAppIcon className="h-4 w-4 mr-2" variant="solid" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
          <Share2 className="h-4 w-4 mr-2" />
          {navigator.share ? "Autres apps" : "Copier le lien"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButton;