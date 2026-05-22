import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:4000`
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");

/**
 * Build a full backend URL with auth token for <img>, <video>, <audio>, <iframe> tags.
 * These browser elements cannot set Authorization headers,
 * so we append the JWT as a query param and point directly to the backend
 * (bypassing the Next.js proxy which can't resolve localhost inside Docker).
 */
export function authUrl(path: string): string {
  try {
    const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    const token = stored?.state?.accessToken;
    const separator = path.includes("?") ? "&" : "?";
    const fullUrl = `${API_URL}${path}`;
    if (token) {
      return `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
    return fullUrl;
  } catch {
    return `${API_URL}${path}`;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
