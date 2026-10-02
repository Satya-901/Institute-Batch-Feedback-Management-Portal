import { NextResponse } from 'next/server';
import { getActiveDatabaseInfo } from '@/lib/sqlDatabase';

export async function GET() {
  try {
    const info = await getActiveDatabaseInfo();
    return NextResponse.json({
      success: true,
      database: info,
      envConfigured: Boolean(process.env.DATABASE_URL),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
