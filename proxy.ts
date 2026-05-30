import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/centro-de-ayuda',
  '/normas-de-extraccion',
  '/api/optimize(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(
  async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  if (userId) {
    const isAdmin = userId === process.env.ADMIN_CLERK_USER_ID;

    // Redirect away from login page once authenticated
    if (pathname === '/') {
      return NextResponse.redirect(new URL(isAdmin ? '/admin/scheduler' : '/client', req.url));
    }

    // Redirect /admin exact to /admin/scheduler (skip layout double-render)
    if (pathname === '/admin') {
      return NextResponse.redirect(new URL('/admin/scheduler', req.url));
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
},
{ clockSkewInMs: 15000 },
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
