export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  FIRMWARE_DETAIL: '/home/firmware/:uploadId',
  UPLOAD: '/upload',
  BIZMNGPAGE: '/business_manager',
  WORLD_MAP: '/world_map',
  DEVICES_BIZMNG: '/view_devices',
  DEVICE_DETAIL: '/view_devices/:serialNumber',
  ADD_DEVICES: '/add_device',
  ADD_SHOP: '/add_shop',
  FIELD_SHOP_DEVICES: '/field_shop_devices',

} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER] as const;

type UserRole = 'developer' | 'developer_manager' | 'business_manager' | 'field_shop_professional' | 'super_user' | null;

export const getHomeRouteForRole = (role: UserRole): string => {
  if (role === 'business_manager') {
    return ROUTES.BIZMNGPAGE;
  } else if (role === 'field_shop_professional') {
    return ROUTES.FIELD_SHOP_DEVICES;
  } else if (role === 'super_user') {
    return ROUTES.REGISTER;
  } else {
    return ROUTES.HOME;
  }
};

export const getHomeRouteFromToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) {
    return ROUTES.HOME;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: UserRole };
    return getHomeRouteForRole(payload.role ?? null);
  } catch {
    return ROUTES.HOME;
  }
};