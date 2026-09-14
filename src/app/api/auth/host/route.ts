import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const HOST_EMAIL = process.env.HOST_EMAIL || 'rahul@admin.com';
const JWT_SECRET = process.env.JWT_SECRET || 'kbc_jwt_super_secure_token_secret_2026';

export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json();

    if (!email || email.trim().toLowerCase() !== HOST_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: `Unauthorized. Host access restricted to ${HOST_EMAIL}.` },
        { status: 401 }
      );
    }

    // Static admin password strictly enforced: rahul@320
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rahul@320';
    const validPin = pin === ADMIN_PASSWORD;
    if (!validPin) {
      return NextResponse.json({ error: 'Invalid Administrator Password' }, { status: 401 });
    }

    const token = jwt.sign(
      {
        email: HOST_EMAIL,
        role: 'HOST',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      host: {
        email: HOST_EMAIL,
        name: 'Rahul (Host & Administrator)',
        role: 'HOST',
      },
    });
  } catch (error) {
    console.error('[Host Auth API Error]', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
