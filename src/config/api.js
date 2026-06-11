// Single source of truth for API base URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default API_BASE;
