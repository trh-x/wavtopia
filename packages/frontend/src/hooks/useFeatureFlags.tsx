import React, { createContext, useContext } from "react";
import { api } from "../api/client";
import { useAuthToken as useAuth } from "./useAuthToken";
import { useQuery } from "@tanstack/react-query";

interface FeatureFlagsContextType {
  enabledFeatures: Set<string>;
  isFeatureEnabled: (feature: string) => boolean;
  isLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  enabledFeatures: new Set(),
  isFeatureEnabled: () => false,
  isLoading: true,
});

export function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken } = useAuth();
  const token = getToken();

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["enabledFeatures", token],
    queryFn: async () => {
      const { flags } = await api.auth.getEnabledFeatures(token);
      return flags;
    },
    // Don't refetch on window focus for feature flags
    refetchOnWindowFocus: false,
  });

  const enabledFeatures = new Set(flags);
  const isFeatureEnabled = (feature: string) => enabledFeatures.has(feature);

  return (
    <FeatureFlagsContext.Provider
      value={{ enabledFeatures, isFeatureEnabled, isLoading }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
