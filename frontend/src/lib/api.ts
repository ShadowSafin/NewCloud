import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";
export const resolveBackendUrl = (url: string) =>
  API_ORIGIN && url.startsWith("/api/") ? `${API_ORIGIN}${url}` : url;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read from Zustand persist storage
    try {
      const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
      const token = stored?.state?.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // fallback
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (reason?: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });

  failedQueue = [];
};

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    if (
      typeof response.data?.data?.url === "string" &&
      response.data.data.url.startsWith("/api/media/")
    ) {
      response.data.data.url = resolveBackendUrl(response.data.data.url);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
        const refreshToken = stored?.state?.refreshToken;
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update Zustand persist storage
        const current = JSON.parse(localStorage.getItem("auth-storage") || "{}");
        if (current?.state) {
          current.state.accessToken = accessToken;
          current.state.refreshToken = newRefreshToken;
          localStorage.setItem("auth-storage", JSON.stringify(current));
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        processQueue(null, accessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear auth storage and redirect
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiClient.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login", data),
  refresh: (refreshToken: string) =>
    apiClient.post("/auth/refresh", { refreshToken }),
  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout", { refreshToken }),
  me: () => apiClient.get("/auth/me"),
};

// Files API
export const filesApi = {
  upload: (formData: FormData, onProgress?: (progress: number) => void) =>
    apiClient.post("/files/upload", formData, {
      headers: { "Content-Type": undefined },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onProgress(percent);
      } : undefined,
    }),
  uploadMultiple: (formData: FormData, onProgress?: (progress: number) => void) =>
    apiClient.post("/files/upload-multiple", formData, {
      headers: { "Content-Type": undefined },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onProgress(percent);
      } : undefined,
    }),
  list: (params?: { folderId?: string; search?: string; sort?: string; order?: string }) =>
    apiClient.get("/files", { params }),
  getById: (id: string) => apiClient.get(`/files/${id}`),
  download: (id: string) =>
    apiClient.get(`/files/${id}/download`, { responseType: "blob" }),
  stream: (id: string) =>
    apiClient.get(`/files/${id}/stream`, { responseType: "blob" }),
  update: (id: string, data: { originalName: string }) =>
    apiClient.patch(`/files/${id}`, data),
  delete: (id: string) => apiClient.delete(`/files/${id}`),
  recent: (limit?: number) =>
    apiClient.get("/files/recent", { params: { limit } }),
  favorites: () => apiClient.get("/files/favorites"),
  toggleFavorite: (id: string) => apiClient.patch(`/files/${id}/favorite`),
  storage: () => apiClient.get("/files/storage"),
  trash: (id: string) => apiClient.patch(`/files/${id}/trash`),
  restore: (id: string) => apiClient.patch(`/files/${id}/restore`),
  permanentDelete: (id: string) => apiClient.delete(`/files/${id}/permanent`),
  listTrash: () => apiClient.get("/files/trash"),
  emptyTrash: () => apiClient.post("/files/trash/empty"),
  copy: (id: string, folderId: string | null) =>
    apiClient.post(`/files/${id}/copy`, { folderId }),
  bulkAction: (action: string, fileIds: string[], targetFolderId?: string) =>
    apiClient.post("/files/bulk", { action, fileIds, targetFolderId }),
};

// Shares API
export const sharesApi = {
  create: (fileId: string, options?: { password?: string; expiresIn?: number }) =>
    apiClient.post("/shares", { fileId, ...options }),
  getByFileId: (fileId: string) => apiClient.get(`/shares/file/${fileId}`),
  delete: (id: string) => apiClient.delete(`/shares/${id}`),
};

// Files API - move method
export const filesApiMove = (id: string, folderId: string | null) =>
  apiClient.patch(`/files/${id}/move`, { folderId });

// Files API - copy method
export const filesApiCopy = (id: string, folderId: string | null) =>
  apiClient.post(`/files/${id}/copy`, { folderId });

// Files API - duplicate method
export const filesApiDuplicate = (id: string) =>
  apiClient.post(`/files/${id}/duplicate`);

// Files API - bulk actions
export const filesApiBulkAction = (action: string, fileIds: string[], targetFolderId?: string) =>
  apiClient.post("/files/bulk", { action, fileIds, targetFolderId });

// Folders API
export const foldersApi = {
  create: (data: { name: string; parentId?: string | null }) =>
    apiClient.post("/folders", data),
  list: (params?: { parentId?: string }) =>
    apiClient.get("/folders", { params }),
  tree: () => apiClient.get("/folders/tree"),
  breadcrumb: (id: string) => apiClient.get(`/folders/${id}/breadcrumb`),
  update: (id: string, data: { name: string }) =>
    apiClient.patch(`/folders/${id}`, data),
  move: (id: string, folderId: string | null) =>
    apiClient.patch(`/folders/${id}/move`, { folderId }),
  copy: (id: string, folderId: string | null) =>
    apiClient.post(`/folders/${id}/copy`, { folderId }),
  delete: (id: string) => apiClient.delete(`/folders/${id}`),
  trash: (id: string) => apiClient.patch(`/folders/${id}/trash`),
  restore: (id: string) => apiClient.patch(`/folders/${id}/restore`),
  permanentDelete: (id: string) => apiClient.delete(`/folders/${id}/permanent`),
  listTrash: () => apiClient.get("/folders/trash"),
};

// Versions API
export const versionsApi = {
  list: (fileId: string) => apiClient.get(`/versions/${fileId}`),
  create: (fileId: string) => apiClient.post(`/versions/${fileId}`),
  restore: (fileId: string, versionNumber: number) =>
    apiClient.post(`/versions/${fileId}/restore/${versionNumber}`),
  delete: (fileId: string, versionNumber: number) =>
    apiClient.delete(`/versions/${fileId}/${versionNumber}`),
};

// Uploads API (chunked upload endpoints)
export const uploadsApi = {
  initiate: (data: { filename: string; mimeType: string; totalSize: number; folderId?: string }) =>
    apiClient.post("/uploads/initiate", data),
  uploadChunk: (sessionId: string, chunkIndex: number, formData: FormData) =>
    apiClient.post(`/uploads/${sessionId}/chunk/${chunkIndex}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  complete: (sessionId: string) => apiClient.post(`/uploads/${sessionId}/complete`),
  cancel: (sessionId: string) => apiClient.post(`/uploads/${sessionId}/cancel`),
  status: (sessionId: string) => apiClient.get(`/uploads/status/${sessionId}`),
  resume: (sessionId: string) => apiClient.get(`/uploads/${sessionId}/resume`),
  sessions: () => apiClient.get("/uploads/sessions"),
};

export const mediaApi = {
  sign: (fileId: string, type: "stream" | "download" | "thumbnail", size?: "small" | "medium" | "large") =>
    apiClient.post("/media/sign", { fileId, type, size }),
};
