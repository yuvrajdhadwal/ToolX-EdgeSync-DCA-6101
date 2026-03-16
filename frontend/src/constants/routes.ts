export const ROUTES = {
  WELCOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/home',
  FIRMWARE_DETAIL: '/home/firmware/:uploadId',
  UPLOAD: '/upload',
  BIZMNGPAGE: '/business_manager',
  DEVICES_BIZMNG: '/view_devices',
  ADD_DEVICES: '/add_device'

} as const;

export const AUTH_ROUTES = [ROUTES.WELCOME, ROUTES.LOGIN, ROUTES.REGISTER] as const;

type UserRole = 'developer' | 'developer_manager' | 'business_manager' | 'field_shop_professional' | null;

export const getHomeRouteForRole = (role: UserRole): string => {
  return role === 'business_manager' ? ROUTES.BIZMNGPAGE : ROUTES.HOME;
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