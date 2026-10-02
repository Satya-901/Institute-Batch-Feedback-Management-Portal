import { NextResponse } from 'next/server';
import { getActiveDatabaseInfo } from '@/lib/sqlDatabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const info = await getActiveDatabaseInfo();
    return NextResponse.json(info);
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err?.message || 'Failed to get database status' },
      { status: 500 }
    );
  }
}
