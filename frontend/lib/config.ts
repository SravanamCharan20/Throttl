const rawBaseUrl = process.env.NEXT_PUBLIC_THROTTL_API_URL ?? "http://localhost:8888";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
