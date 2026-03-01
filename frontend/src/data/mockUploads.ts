import { UPLOAD_STATUS, type UploadItem } from '../types/upload';

export const MOCK_UPLOADS: UploadItem[] = [
  {
    id: 'U-1001',
    date: '2026-02-10',
    version: 'v1.8.2',
    priority: 'High',
    developer: 'A. Hughes',
    shortDescription: 'Fix sync timeout under high load',
    status: UPLOAD_STATUS.CURRENT,
  },
  {
    id: 'U-1002',
    date: '2026-02-12',
    version: 'v1.8.3',
    priority: 'Medium',
    developer: 'K. Singh',
    shortDescription: 'Improve audit log formatting',
    status: UPLOAD_STATUS.CURRENT,
  },
  {
    id: 'U-1003',
    date: '2026-02-18',
    version: 'v1.9.0-rc1',
    priority: 'High',
    developer: 'M. Chen',
    shortDescription: 'Add edge retry backoff tuning',
    status: UPLOAD_STATUS.PENDING,
  },
  {
    id: 'U-1004',
    date: '2026-02-20',
    version: 'v1.9.0-rc2',
    priority: 'Low',
    developer: 'L. Rivera',
    shortDescription: 'Update dashboard labels',
    status: UPLOAD_STATUS.PENDING,
  },
  {
    id: 'U-1005',
    date: '2026-02-14',
    version: 'v1.8.1-hotfix',
    priority: 'Critical',
    developer: 'R. Patel',
    shortDescription: 'Rollback due to auth token regression',
    status: UPLOAD_STATUS.REJECTED,
  },
];
