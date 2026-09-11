import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // Only IPv4 and non-internal
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    const primaryIp = addresses[0] || 'localhost';
    const port = process.env.PORT || '3000';

    return NextResponse.json({
      localIp: primaryIp,
      port,
      joinUrl: `http://${primaryIp}:${port}/candidate`,
      hostUrl: `http://${primaryIp}:${port}/host`,
    });
  } catch (err) {
    return NextResponse.json({ localIp: 'localhost', port: '3000', joinUrl: 'http://localhost:3000/candidate' });
  }
}
