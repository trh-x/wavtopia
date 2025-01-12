import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuthToken as useAuth } from "./useAuthToken";

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
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    async function fetchFeatures() {
      const token = getToken();
      if (!token) {
        setEnabledFeatures(new Set());
        setIsLoading(false);
        return;
      }

      try {
        const { flags } = await api.auth.getEnabledFeatures(token);
        setEnabledFeatures(new Set(flags));
      } catch (error) {
        console.error("Failed to fetch feature flags:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeatures();
  }, [getToken]);

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
