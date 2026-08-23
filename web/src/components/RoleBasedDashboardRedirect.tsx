import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const RoleBasedDashboardRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  const { data: isPartner, isLoading: roleLoading } = useQuery({
    queryKey: ["dashboard-entry-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "partner",
      });
      if (error) throw error;
      return data === true;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (isPartner) return <Navigate to="/partner/dashboard" replace />;
  return <>{children}</>;
};

export default RoleBasedDashboardRedirect;
