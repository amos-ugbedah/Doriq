// Single source of truth for API base URL
// VITE_API_URL should be set to: https://ugbedah001-doriq.hf.space (NO trailing slash, NO /api)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to get full API URL with /api prefix
export const getApiUrl = (endpoint) => {
    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE}/api${cleanEndpoint}`;
};

export default API_BASE;