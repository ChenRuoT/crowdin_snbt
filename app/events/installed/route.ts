import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshCrowdinToken } from '@/lib/crowdinAuth';

interface InstalledBody {
  appId: string;
  appSecret: string;
  domain: string;
  organizationId: string | number;
  userId: string | number;
  baseUrl: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as InstalledBody;

  const { CROWDIN_CLIENT_ID, CROWDIN_CLIENT_SECRET, AUTH_URL } = process.env;
  if (!CROWDIN_CLIENT_ID || !CROWDIN_CLIENT_SECRET || !AUTH_URL) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let newTokenData;
  try {
    newTokenData = await refreshCrowdinToken({
      appId: body.appId,
      appSecret: body.appSecret,
      domain: body.domain,
      userId: Number(body.userId),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to obtain Crowdin token' }, { status: 500 });
  }

  const organizationData = {
    domain: body.domain,
    organizationId: Number(body.organizationId),
    appId: body.appId,
    appSecret: body.appSecret,
    userId: Number(body.userId),
    baseUrl: body.baseUrl,
    accessToken: newTokenData.accessToken,
    accessTokenExpires: newTokenData.accessTokenExpires,
  };

  try {
    const existing = await prisma.organization.findFirst({
      where: {
        domain: body.domain,
        organizationId: Number(body.organizationId),
      },
    });

    if (existing) {
      await prisma.organization.update({ where: { id: existing.id }, data: organizationData });
    } else {
      await prisma.organization.create({ data: organizationData });
    }

    return NextResponse.json({ message: 'Installation processed successfully' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
  }
}
