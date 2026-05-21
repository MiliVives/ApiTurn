import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/', '/api/optimize(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  if (userId) {
    const isAdmin = userId === process.env.ADMIN_CLERK_USER_ID;

    // Redirect away from login page once authenticated
    if (pathname === '/') {
      return NextResponse.redirect(new URL(isAdmin ? '/admin' : '/client', req.url));
    }

    // Block non-admins from /admin
    if (pathname.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL('/client', req.url));
    }
  } else {
    // Redirect unauthenticated users to /
    if (!isPublicRoute(req)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
