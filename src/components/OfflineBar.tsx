import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const OfflineBar = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground text-center text-sm py-1 px-3 flex items-center justify-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      Hors ligne
    </div>
  );
};

export default OfflineBar;
