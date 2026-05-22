import axios from "axios";

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
};

const API_URL = getApiUrl();

export const publicClient = axios.create({
  baseURL: `${API_URL}/api`,
});

export const publicSharesApi = {
  get: (token: string, password?: string) =>
    publicClient.get(`/shares/public/${token}`, { params: { password } }),
  download: (token: string, password?: string) =>
    publicClient.get(`/shares/public/${token}/download`, {
      params: { password },
      responseType: "blob",
    }),
  streamUrl: (token: string, password?: string) => {
    const params = password ? `?password=${encodeURIComponent(password)}` : "";
    return `${API_URL}/api/shares/public/${token}/stream${params}`;
  },
};
