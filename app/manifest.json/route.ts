import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshCrowdinToken } from '@/lib/crowdinAuth';
/**
 * Serve the Crowdin **App Descriptor (manifest)** as a JSON response.
 *
 * The manifest tells Crowdin how to install and integrate the app:
 *   – identifier, name, logo
 *   – OAuth details (client id)
 *   – event web-hooks (installed / uninstall)
 *   – requested scopes
 *   – app modules (project-menu, custom file format, etc.)
 *
 * The route is automatically picked up by Next.js because it lives inside the
 * `app/manifest.json` folder and returns a `NextResponse` with `.json()`.
 */
interface InstalledBody {
  appId: string;
  appSecret: string;
  domain: string;
  organizationId: string | number;
  userId: string | number;
  baseUrl: string;
}
interface UninstallBody {
  domain: string;
  organizationId: string | number;
}
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const body = await request.json();
  const { slug } = await params;

  switch (slug) {
    case 'installed': {
      const { CROWDIN_CLIENT_ID, CROWDIN_CLIENT_SECRET, AUTH_URL } = process.env;

      if (!CROWDIN_CLIENT_ID || !CROWDIN_CLIENT_SECRET || !AUTH_URL) {
        console.error('Missing environment variables for Crowdin OAuth');

        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const eventBody = body as InstalledBody;

      let newTokenData: { accessToken: string; accessTokenExpires: number };
      try {
        newTokenData = await refreshCrowdinToken({
          appId: eventBody.appId,
          appSecret: eventBody.appSecret,
          domain: eventBody.domain,
          userId: Number(eventBody.userId),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to obtain Crowdin token during installation.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

      const organizationData = {
        domain: eventBody.domain,
        organizationId: Number(eventBody.organizationId),
        appId: eventBody.appId,
        appSecret: eventBody.appSecret,
        userId: Number(eventBody.userId),
        baseUrl: eventBody.baseUrl,
        accessToken: newTokenData.accessToken,
        accessTokenExpires: newTokenData.accessTokenExpires,
      };

      try {
        const existingOrganization = await prisma.organization.findFirst({
          where: {
            domain: eventBody.domain,
            organizationId: Number(eventBody.organizationId),
          },
        });

        if (existingOrganization) {
          await prisma.organization.update({
            where: { id: existingOrganization.id },
            data: organizationData,
          });
        } else {
          await prisma.organization.create({
            data: organizationData,
          });
        }

        return NextResponse.json(
          { message: 'Installation processed successfully' },
          { status: 200 }
        );
      } catch (dbError) {
        console.error('Database error during installed event:', dbError);

        return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
      }
    }

    case 'uninstall': {
      const eventBody = body as UninstallBody;

      try {
        await prisma.organization.deleteMany({
          where: {
            domain: eventBody.domain,
            organizationId: Number(eventBody.organizationId),
          },
        });

        return NextResponse.json(
          { message: 'Uninstallation processed successfully' },
          { status: 200 }
        );
      } catch (dbError) {
        console.error('Database error during uninstall event:', dbError);

        return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
      }
    }

    default:
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
export async function GET() {
  const manifestData = {
    identifier: 'SNBT',
    name: 'SNBT',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    logo: '/logo.svg',
    authentication: {
      type: 'crowdin_app',
      clientId: process.env.CROWDIN_CLIENT_ID,
    },
    events: {
      installed: '/events/installed',
      uninstall: '/events/uninstall',
    },
    scopes: ['project'],
    modules: {
      'project-menu': [
        {
          key: 'menu',
          name: 'SNBT',
          url: '/project-menu',
        },
      ],
    },
  };

  return NextResponse.json(manifestData);
}
