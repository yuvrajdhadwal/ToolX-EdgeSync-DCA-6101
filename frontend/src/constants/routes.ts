export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  DEVELOPERPAGE: '/developer',
  UPLOAD: '/upload',
  DEVICETYPE: '/device_type'
} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER] as const;