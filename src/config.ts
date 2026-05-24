// Azure BE URL — đổi đây nếu redeploy
const AZURE_BASE = 'https://loto-mln131-h5h2e3dccdcuesgb.southeastasia-01.azurewebsites.net';

// Cho phép override qua env var (ví dụ test local BE)
const BASE = import.meta.env.VITE_API_BASE || AZURE_BASE;

export const API_BASE = `${BASE}/api`;
export const HUB_URL = `${BASE}/hubs/game`;