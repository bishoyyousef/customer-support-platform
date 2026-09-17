import type { IPortalDataService } from './portalDataService.interface';
import { RealPortalDataService } from './api';
import { DemoPortalDataService } from './demoDataService';

const getInitialDemoMode = (): boolean => {
  if (typeof window !== 'undefined') {
    const forced = localStorage.getItem('support_platform_force_demo');
    if (forced === 'true') return true;
    if (forced === 'false') return false;
  }

  const envDemo = import.meta.env.VITE_DEMO_MODE;
  if (envDemo === 'true') return true;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const isExternalHost = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  const isUnreachableApi = !import.meta.env.VITE_API_BASE_URL ||
    apiBase.includes('localhost') ||
    apiBase.includes('yourdomain.com');

  // If deployed on Vercel/external static host and API URL is localhost/placeholder, default to Demo Mode
  if (isExternalHost && isUnreachableApi) {
    return true;
  }

  return envDemo === 'true';
};

export const isDemoMode: boolean = getInitialDemoMode();

export const setDemoModeOverride = (enable: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('support_platform_force_demo', enable ? 'true' : 'false');
    window.location.reload();
  }
};

export const dataService: IPortalDataService = isDemoMode
  ? new DemoPortalDataService()
  : new RealPortalDataService();

