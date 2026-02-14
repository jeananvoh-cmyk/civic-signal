import { useState, useRef } from "react";
import { Camera, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  photoUrl: string | null;
}

const PhotoUpload = ({ onPhotoUploaded, photoUrl }: PhotoUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("report-photos")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("report-photos")
        .getPublicUrl(path);
      
      onPhotoUploaded(urlData.publicUrl);
      toast.success("Photo ajoutée !");
    } catch (err: any) {
      toast.error(getUserFriendlyError(err, "Erreur lors de l'upload"));
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    onPhotoUploaded("");
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={photoUrl} alt="Photo du signalement" className="w-full h-40 object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={removePhoto}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload en cours...</span>
            </>
          ) : (
            <>
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ajouter une photo (optionnel)</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default PhotoUpload;
