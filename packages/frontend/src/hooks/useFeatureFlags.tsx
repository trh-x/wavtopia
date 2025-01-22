import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { api } from "../api/client";
import { useAuthToken } from "./useAuthToken";
import { useQuery } from "@tanstack/react-query";

interface FeatureFlagsState {
  enabledFeatures: Set<string>;
  isLoading: boolean;
  setEnabledFeatures: (features: Set<string>) => void;
  setIsLoading: (isLoading: boolean) => void;
  isFeatureEnabled: (feature: string) => boolean;
}

const useFeatureFlagsStore = create<FeatureFlagsState>()(
  immer((set, get) => ({
    enabledFeatures: new Set<string>(),
    isLoading: true,
    setEnabledFeatures: (features: Set<string>) => {
      set((state) => {
        state.enabledFeatures = features;
      });
    },
    setIsLoading: (isLoading: boolean) => {
      set((state) => {
        state.isLoading = isLoading;
      });
    },
    isFeatureEnabled: (feature: string) => get().enabledFeatures.has(feature),
  }))
);

export function useInitializeFeatureFlags() {
  const { getToken } = useAuthToken();
  const token = getToken();

  const { setEnabledFeatures, setIsLoading } = useFeatureFlagsStore();

  // Use React Query to fetch and manage feature flags
  useQuery({
    queryKey: ["enabledFeatures", token],
    queryFn: async () => {
      setIsLoading(true);

      try {
        const { flags } = await api.auth.getEnabledFeatures(token);

        setEnabledFeatures(new Set(flags));
        setIsLoading(false);
        return flags;
      } catch (error) {
        setIsLoading(false);
        throw error;
      }
    },
    // Don't refetch on window focus for feature flags
    refetchOnWindowFocus: false,
  });
}

export function useFeatureFlags() {
  const { enabledFeatures, isLoading, isFeatureEnabled } =
    useFeatureFlagsStore();

  return {
    enabledFeatures,
    isFeatureEnabled,
    isLoading,
  };
}
