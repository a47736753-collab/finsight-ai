import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";

const VITE_CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

export function useAuth() {
  if (!VITE_CONVEX_URL) {
    return {
      isLoading: false,
      isAuthenticated: true,
      isConvexConfigured: false,
      user: { _id: "demo-user", name: "Guest User", email: "guest@finsight.ai" },
      signIn: async () => {
        console.warn("Convex deployment URL is not configured in VITE_CONVEX_URL.");
      },
      signOut: async () => {
        console.warn("Convex deployment URL is not configured in VITE_CONVEX_URL.");
      },
    };
  }

  return useConvexAuthImpl();
}

function useConvexAuthImpl() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  const isLoading = isAuthLoading || user === undefined;

  return {
    isLoading,
    isAuthenticated,
    isConvexConfigured: true,
    user,
    signIn,
    signOut,
  };
}
