// TODO: We need to set up a way to share endpoint return types between backend and frontend
// This type is currently duplicated from packages/backend/src/services/storage.ts
export interface QuotaWarning {
  message: string;
  currentUsage: number;
  quota: number;
}
