import { auth } from "@/utils/auth";

export function useAuthToken() {
  return {
    token: auth.getToken(),
    getToken: auth.getToken,
    appendTokenToUrl: auth.appendTokenToUrl,
  };
}

export function getAudioUrl(path: string): string {
  return auth.appendTokenToUrl(path);
}
