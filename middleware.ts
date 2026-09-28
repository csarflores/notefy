export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/project/:path*',
    '/parent-project/:path*',
    '/board/:path*',
    '/notes/:path*',
    '/calendar/:path*',
    '/settings/:path*',
    '/trash/:path*',
  ],
};
