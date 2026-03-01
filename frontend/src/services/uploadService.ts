import { MOCK_UPLOADS } from '../data/mockUploads';
import type { UploadItem, UploadStatus } from '../types/upload';

const MOCK_NETWORK_DELAY_MS = 200;

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const getUploadsByStatus = async (status: UploadStatus): Promise<UploadItem[]> => {
  await delay(MOCK_NETWORK_DELAY_MS);
  return MOCK_UPLOADS.filter((upload) => upload.status === status);
};

export const getUploadById = async (uploadId: string): Promise<UploadItem | null> => {
  await delay(MOCK_NETWORK_DELAY_MS);
  return MOCK_UPLOADS.find((upload) => upload.id === uploadId) ?? null;
};

export const updateUploadStatus = async (
  uploadId: string,
  status: UploadStatus,
): Promise<UploadItem | null> => {
  await delay(MOCK_NETWORK_DELAY_MS);
  const upload = MOCK_UPLOADS.find((item) => item.id === uploadId);

  if (!upload) {
    return null;
  }

  upload.status = status;
  return upload;
};
