import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`signa_roles_${user.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    // Try loading cached roles immediately
    try {
      const cached = localStorage.getItem(`signa_roles_${user.id}`);
      if (cached) {
        setRoles(JSON.parse(cached));
      }
    } catch (_) {}

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        let rolesList: AppRole[] = [];
        if (!error && data && data.length > 0) {
          rolesList = data.map((r) => r.role as AppRole);
        } else {
          // Fallback to has_role RPC
          const [adminRes, modRes] = await Promise.allSettled([
            supabase.rpc("has_role", { _user_id: user.id, _role: "admin" } as any),
            supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" } as any),
          ]);

          if (adminRes.status === "fulfilled" && adminRes.value.data === true) {
            rolesList.push("admin");
          }
          if (modRes.status === "fulfilled" && modRes.value.data === true) {
            rolesList.push("moderator");
          }
        }

        if (rolesList.length > 0) {
          localStorage.setItem(`signa_roles_${user.id}`, JSON.stringify(rolesList));
          setRoles(rolesList);
        }
      } catch (_) {
        // preserve cached roles on network hiccup
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const canValidate = isAdmin || isModerator;

  return { roles, isAdmin, isModerator, canValidate, loading: authLoading || loading };
};
