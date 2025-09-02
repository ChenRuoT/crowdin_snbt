import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

interface DecodedJwtPayload {
  domain: string;
  context: {
    organization_id: number;
    user_id: number;
  };
  iat?: number;
  exp?: number;
}

const CROWDIN_CLIENT_SECRET = process.env.CROWDIN_CLIENT_SECRET;

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('Authorization');
  let token: string | undefined | null = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : undefined;

  if (!token) {
    token = request.nextUrl.searchParams.get('jwtToken');
  }

  if (!token) {
    return NextResponse.json(
      { error: { message: 'User is not authorized. Missing or invalid token.' } },
      { status: 401 }
    );
  }

  if (!CROWDIN_CLIENT_SECRET) {
    console.error('CROWDIN_CLIENT_SECRET is not defined in environment variables for middleware.');
    return NextResponse.json(
      { error: { message: 'Server configuration error in middleware.' } },
      { status: 500 }
    );
  }

  try {
    const secretKey = new TextEncoder().encode(CROWDIN_CLIENT_SECRET);

    const { payload } = (await jwtVerify(token, secretKey)) as { payload: DecodedJwtPayload };

    const decodedJwt = payload;

    console.log('decodedJwt', decodedJwt);

    if (!decodedJwt.context?.user_id || !decodedJwt.context?.organization_id) {
      console.error('Middleware: JWT is missing necessary fields (user_id or organization_id).');

      return NextResponse.json({ error: { message: 'Invalid token payload.' } }, { status: 403 });
    }

    const requestHeaders = new Headers(request.headers);
    if (decodedJwt) {
      requestHeaders.set('x-decoded-jwt', JSON.stringify(decodedJwt));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware JWT verification failed:', error);
    let errorMessage = 'User is not authorized. Token verification failed.';
    if (
      error instanceof Error &&
      (error.name === 'JWTExpired' ||
        error.name === 'JWSSignatureVerificationFailed' ||
        error.name === 'JWSInvalid')
    ) {
      errorMessage = `Token error: ${error.message}`;
    }

    return NextResponse.json({ error: { message: errorMessage } }, { status: 403 });
  }
}

export const config = {
  matcher: ['/api/user/:path*', '/api/file/process/:path*'],
};
