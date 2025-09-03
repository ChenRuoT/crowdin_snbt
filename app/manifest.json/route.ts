import { NextResponse } from 'next/server';

export async function GET() {
  const manifestData = {
    identifier: 'snbt',
    name: 'SNBT',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL, // 例如 https://your-app.vercel.app
    logo: '/logo.svg',
    authentication: {
      type: 'crowdin_app',
      clientId: process.env.CROWDIN_CLIENT_ID, // 来自 Crowdin 的 OAuth 应用
    },
    events: {
      installed: '/events/installed',
      uninstall: '/events/uninstall',
    },
    scopes: ['project'],
    modules: {
      'project-menu': [{ key: 'menu', name: 'SNBT', url: '/project-menu' }],
      'custom-file-format': [
        {
          key: 'snbt-processing',
          type: 'snbt-processing',
          url: '/api/file/process',
          signaturePatterns: {
            fileName: '.+\\.snbt$',
            fileContent: '.*',
          },
        },
      ],
    },
  };

  return NextResponse.json(manifestData);
}
