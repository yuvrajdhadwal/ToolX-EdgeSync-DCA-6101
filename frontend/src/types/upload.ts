export const UPLOAD_STATUS = {
  CURRENT: 'current',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];

export type UploadItem = {
  id: number;
  version_number: string;
  device_type: string;
  description: string | null;
  isEmergency: boolean;
  uploaded_by: number | null;
  uploaded_timestamp: string | null;
  approved_by: number | null;
  declined_by: number | null;
  declined_comment: string | null;
  status: UploadStatus;
};
