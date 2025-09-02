import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface UninstallBody {
  domain: string;
  organizationId: string | number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as UninstallBody;

  try {
    await prisma.organization.deleteMany({
      where: {
        domain: body.domain,
        organizationId: Number(body.organizationId),
      },
    });
    return NextResponse.json({ message: 'Uninstallation processed successfully' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
  }
}
