export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  FIRMWARE_DETAIL: '/home/firmware/:uploadId',
  DEVELOPERPAGE: '/developer',
  UPLOAD: '/upload'
} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.UPLOAD] as const;