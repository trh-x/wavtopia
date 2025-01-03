export function useAuthToken() {
  return {
    getToken: () => localStorage.getItem("token"),
    getAuthHeader: () => `Bearer ${localStorage.getItem("token")}`,
    appendTokenToUrl: (url: string) =>
      `${url}?token=${localStorage.getItem("token")}`,
  };
}

export function getAudioUrl(path: string): string {
  const { appendTokenToUrl } = useAuthToken();
  return appendTokenToUrl(path);
}
