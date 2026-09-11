import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all LAN IPs and local connections in dev mode (mobile phones on Wi-Fi, tablets, other PCs)
  allowedDevOrigins: [
    '192.168.1.26',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.local',
  ],
};

export default nextConfig;
