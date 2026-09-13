import { NextRequest, NextResponse } from 'next/server';

/**
 * Splits the one Next.js app across two Vercel deployments — a
 * Super-Admin-only domain and a company-workspace-only domain — mirroring
 * the user's existing smart-bi-studio setup (separate admin/app projects
 * off one codebase). Controlled by the server-side `PANEL_MODE` env var,
 * set per Vercel project (not per env-file — this is deployment topology,
 * not app config): `admin` | `company` | unset.
 *
 * Unset (the original combined `database-software-web` project) applies no
 * redirects at all — behavior there is unchanged.
 */
export function middleware(request: NextRequest) {
  const panelMode = process.env.PANEL_MODE;
  const { pathname } = request.nextUrl;

  if (panelMode === 'admin') {
    if (pathname === '/' || pathname.startsWith('/company')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  if (panelMode === 'company') {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*', '/company/:path*'],
};
