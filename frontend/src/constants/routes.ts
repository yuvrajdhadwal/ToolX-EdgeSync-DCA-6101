export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  DEVELOPERPAGE: '/developer',
  UPLOAD: '/upload'
  BIZMNGPAGE: '/business_manager',
  DEVICEADD: 'add_device'
} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER] as const;