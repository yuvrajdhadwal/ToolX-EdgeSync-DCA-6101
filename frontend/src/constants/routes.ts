export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  FIRMWARE_DETAIL: '/home/firmware/:uploadId',
  DEVELOPERPAGE: '/developer',
  UPLOAD: '/upload',
  DEVICETYPE: '/device_type',
  BIZMNGPAGE: '/business_manager',
  DEVICES_BIZMNG: '/view_devices',
  ADD_DEVICES: '/add_device',

} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER] as const;