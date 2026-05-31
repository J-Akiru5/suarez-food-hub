import { updateSession } from '@repo/supabase/middleware';
import { type NextRequest } from 'next/server';

const protectedRoutes = ['/', '/orders', '/inventory', '/categories', '/riders', '/reports'];
const authRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);

  const { pathname } = request.nextUrl;

  const hasSession =
    request.cookies.get('sb-access-token') !== undefined ||
    request.cookies.get('sb-refresh-token') !== undefined;

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return Response.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return Response.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
