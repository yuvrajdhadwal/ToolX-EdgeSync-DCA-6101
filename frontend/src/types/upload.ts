export const UPLOAD_STATUS = {
  CURRENT: 'current',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];

export type UploadItem = {
  id: string;
  date: string;
  version: string;
  priority: string;
  developer: string;
  shortDescription: string;
  status: UploadStatus;
};
