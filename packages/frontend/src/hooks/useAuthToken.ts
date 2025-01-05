const getStoredToken = () => localStorage.getItem("token");

const appendTokenToUrlImpl = (url: string): string => {
  const token = getStoredToken();
  return token ? `${url}?token=${token}` : url;
};

export function useAuthToken() {
  return {
    getToken: getStoredToken,
    appendTokenToUrl: appendTokenToUrlImpl,
  };
}

export function getAudioUrl(path: string): string {
  return appendTokenToUrlImpl(path);
}
