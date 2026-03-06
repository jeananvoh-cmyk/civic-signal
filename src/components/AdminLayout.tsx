import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  FileText, Users, Trash2, BarChart3, Shield, ChevronLeft, ScrollText, Heart, Megaphone, MapPin 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Vue d'ensemble", path: "/admin", icon: Shield },
  { label: "Signalements", path: "/admin/signalements", icon: FileText },
  { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users },
  { label: "Suppressions", path: "/admin/suppressions", icon: Trash2 },
  { label: "Purge données", path: "/admin/purge", icon: Trash2 },
  { label: "Statistiques", path: "/admin/stats", icon: BarChart3 },
  { label: "Vulnérables", path: "/admin/vulnerables", icon: Heart },
  { label: "Messagerie", path: "/admin/messagerie", icon: Megaphone },
  { label: "Quartiers", path: "/admin/quartiers", icon: MapPin },
  { label: "Journal", path: "/admin/journal", icon: ScrollText },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Admin</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Panneau d'administration</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-4 w-4" />
            Retour à l'app
          </Button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-xs rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
