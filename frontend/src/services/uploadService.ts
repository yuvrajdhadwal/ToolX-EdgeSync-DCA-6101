import type { UploadItem, UploadStatus } from '../types/upload';

export const getUploadsByStatus = async (status: UploadStatus): Promise<UploadItem[]> => {
  const response = await fetch(`/firmware/status/${status}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch firmware: ${response.statusText}`);
  }
  
  return response.json();
};

export const getUploadById = async (uploadId: number): Promise<UploadItem | null> => {
  const response = await fetch(`/firmware/${uploadId}`);
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    throw new Error(`Failed to fetch firmware: ${response.statusText}`);
  }
  
  return response.json();
};

