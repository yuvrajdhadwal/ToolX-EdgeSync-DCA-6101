export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  UPLOAD: '/upload'
} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.UPLOAD] as const;