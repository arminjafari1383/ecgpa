import axios from "axios";

// Nginx on port 1000 forwards /api/* to the existing backend service.
// This keeps the admin UI isolated while reusing the same API and database.
export const api = axios.create({
  baseURL: "/api/",
  timeout: 30000,
});
export default api;
