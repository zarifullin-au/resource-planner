export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/heatmap/:path*',
    '/objects/:path*',
    '/contracts/:path*',
    '/employees/:path*',
    '/norms/:path*',
    '/settings/:path*',
  ],
}
