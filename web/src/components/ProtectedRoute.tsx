import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

type ProtectedRole = "partner" | "admin" | "moderator";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: ProtectedRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  const { data: hasRequiredRole, isLoading: roleLoading } = useQuery({
    queryKey: ["protected-route-role", user?.id, requiredRole],
    queryFn: async () => {
      if (!user || !requiredRole) return true;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: requiredRole,
      });
      if (error) throw error;
      return data === true;
    },
    enabled: !!user && !!requiredRole,
    staleTime: 30_000,
  });

  if (loading || (requiredRole && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && hasRequiredRole === false) {
    return <Navigate to="/tableau-de-bord" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
