import { create, StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { api } from "../api/client";
import { useAuthToken } from "./useAuthToken";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FeatureFlag } from "@wavtopia/core-storage";

type Middlewares = [["zustand/devtools", never], ["zustand/immer", never]];

interface FeatureFlagsSlice {
  featureFlags: {
    enabledFeatures: Set<string>;
    isLoading: boolean;
    setEnabledFeatures: (features: Set<string>) => void;
    setIsLoading: (isLoading: boolean) => void;
    isFeatureEnabled: (feature: string) => boolean;
  };
}

interface FeatureFlagsAdminSlice {
  featureFlagsAdmin: {
    isLoading: boolean;
    flags: FeatureFlag[];
    setFlags: (flags: FeatureFlag[]) => void;
    setIsLoading: (isLoading: boolean) => void;
  };
}

type StoreState = FeatureFlagsSlice & FeatureFlagsAdminSlice;

type SliceCreator<T> = StateCreator<StoreState, Middlewares, [], T>;

const createFeatureFlagsSlice: SliceCreator<FeatureFlagsSlice> = (
  set,
  get
) => ({
  featureFlags: {
    enabledFeatures: new Set<string>(),
    isLoading: false,
    setEnabledFeatures: (features) =>
      set((state) => {
        state.featureFlags.enabledFeatures = features;
      }),
    setIsLoading: (isLoading) =>
      set((state) => {
        state.featureFlags.isLoading = isLoading;
      }),
    isFeatureEnabled: (feature) =>
      get().featureFlags.enabledFeatures.has(feature),
  },
});

const createFeatureFlagsAdminSlice: SliceCreator<FeatureFlagsAdminSlice> = (
  set
) => ({
  featureFlagsAdmin: {
    isLoading: false,
    flags: [],
    setFlags: (flags) =>
      set((state) => {
        state.featureFlagsAdmin.flags = flags;
      }),
    setIsLoading: (isLoading) =>
      set((state) => {
        state.featureFlagsAdmin.isLoading = isLoading;
      }),
  },
});

// Create the store with combined slices
const useStore = create<StoreState>()(
  devtools(
    immer((...a) => ({
      ...createFeatureFlagsSlice(...a),
      ...createFeatureFlagsAdminSlice(...a),
    }))
  )
);

export function useInitializeFeatureFlags() {
  const { getToken } = useAuthToken();
  const token = getToken();

  const {
    featureFlags: { setEnabledFeatures, setIsLoading },
  } = useStore();

  // Use React Query to fetch and manage feature flags
  useQuery({
    queryKey: ["enabledFeatures", token],
    queryFn: async () => {
      setIsLoading(true);

      try {
        const { flags } = await api.auth.getEnabledFeatures(token);

        console.log("flags", flags);
        setEnabledFeatures(new Set(flags));
        return flags;
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },

    // Don't refetch on window focus for feature flags
    refetchOnWindowFocus: false,
  });
}

export function useFeatureFlags() {
  const {
    featureFlags: { enabledFeatures, isLoading, isFeatureEnabled },
  } = useStore();

  return {
    enabledFeatures,
    isFeatureEnabled,
    isLoading,
  };
}

export function useFeatureFlagsAdmin() {
  const { getToken } = useAuthToken();
  const token = getToken();
  const queryClient = useQueryClient();
  const {
    featureFlagsAdmin: { setFlags, flags, setIsLoading, isLoading },
  } = useStore();

  const { refetch } = useQuery({
    queryKey: ["adminFeatureFlags", token],
    queryFn: async () => {
      if (!token) throw new Error("No auth token");

      setIsLoading(true);

      try {
        const response = await api.admin.getFeatureFlags(token);
        setFlags(response.flags);
        return response.flags;
      } catch (error) {
        console.error("Failed to load feature flags:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  function refetchFeatureFlags() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["enabledFeatures", token] });
  }

  const toggleFlag = async (flagId: string, isEnabled: boolean) => {
    if (!token) throw new Error("No auth token");
    try {
      await api.admin.updateFeatureFlag(token, flagId, { isEnabled });
      await refetchFeatureFlags();
    } catch (error) {
      console.error("Failed to update feature flag:", error);
      throw error;
    }
  };

  const createFlag = async (flag: { name: string; description: string }) => {
    if (!token) throw new Error("No auth token");
    try {
      await api.admin.createFeatureFlag(token, flag);
      await refetchFeatureFlags();
    } catch (error) {
      console.error("Failed to create feature flag:", error);
      throw error;
    }
  };

  return {
    flags,
    isLoading,
    toggleFlag,
    createFlag,
  };
}
