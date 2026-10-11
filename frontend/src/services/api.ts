import axios from "axios";

interface ApiEnvelope<T> {
    data: T;
}
interface ApiErrorEnvelope {
    error?: { code?: string; message?: string; details?: unknown };
}

let accessToken: string | null = null;
export function setAccessToken(token: string | null): void {
    accessToken = token;
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    timeout: 20000,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401 &&
            !error.config?.url?.startsWith("/auth/login") &&
            !error.config?.url?.startsWith("/auth/register")
        ) {
            const failedToken = error.config?.headers.Authorization;
            if (failedToken === `Bearer ${accessToken}`)
                window.dispatchEvent(new Event("sureflight:session-expired"));
        }
        return Promise.reject(error);
    }
);

export async function getData<T>(url: string): Promise<T> {
    const response = await api.get<ApiEnvelope<T>>(url);
    const result = response.data.data;
    return result;
}

export async function postData<T>(url: string, input: unknown): Promise<T> {
    const response = await api.post<ApiEnvelope<T>>(url, input);
    const result = response.data.data;
    return result;
}

export async function patchData<T>(url: string, input: unknown): Promise<T> {
    const response = await api.patch<ApiEnvelope<T>>(url, input);
    const result = response.data.data;
    return result;
}

export function errorMessage(error: unknown): string {
    if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
        if (!error.response) {
            const message =
                "We could not reach SureFlight. Check your connection and try again.";
            return message;
        }
        const message =
            error.response.data?.error?.message ||
            "Something went wrong. Please try again.";
        return message;
    }
    const message =
        error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";
    return message;
}

// Direct API functions matching end-test syntax:
export async function getTrackedFlights() {
    return getData("/trackedFlights");
}

export async function createTrackedFlight(input: unknown) {
    return postData("/trackedFlights", input);
}

export async function deleteTrackedFlight(id: string): Promise<void> {
    await api.delete(`/trackedFlights/${encodeURIComponent(id)}`);
}

export async function loginUser(data: unknown) {
    return postData("/auth/login", data);
}

export async function registerUser(data: unknown) {
    return postData("/auth/register", data);
}

export async function getClaims() {
    return getData("/claims");
}

export async function getClaimById(id: string) {
    return getData(`/claims/${encodeURIComponent(id)}`);
}
