import type { IPortalDataService } from './portalDataService.interface';
import { RealPortalDataService } from './api';
import { DemoPortalDataService } from './demoDataService';

export const isDemoMode: boolean = import.meta.env.VITE_DEMO_MODE === 'true';

export const dataService: IPortalDataService = isDemoMode
  ? new DemoPortalDataService()
  : new RealPortalDataService();
