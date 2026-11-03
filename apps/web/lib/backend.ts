// Docker builds and runs with the fixed backend service address; local dev uses loopback.
export const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:3002"
