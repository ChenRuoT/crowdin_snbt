import { NextResponse } from 'next/server';

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
export async function GET() {
  const manifestData = {
    identifier: 'snbt',
    name: 'SNBT',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    logo: '/logo.svg',
    authentication: {
      type: 'oauth2',
      clientId: process.env.CROWDIN_CLIENT_ID,
      redirectUrls: [`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`],
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
      'custom-file-format': [
        {
          key: 'custom-file-format',
          type: 'custom-file-format',
          url: '/api/file/process',
          signaturePatterns: {
            fileName: '.+\\.snbt$',
            fileContent: '"hello_world":',
          },
        },
      ],
    },
  };

  return NextResponse.json(manifestData);
}
