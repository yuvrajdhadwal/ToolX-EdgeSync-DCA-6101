import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

type UploadStatus = 'current' | 'pending' | 'rejected';

type UploadItem = {
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

const getUploadById = async (uploadId: number): Promise<UploadItem | null> => {
  const response = await fetch(`/firmware/${uploadId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch firmware: ${response.statusText}`);
  }

  return response.json();
};

const FirmwareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams<{ uploadId: string }>();
  const [firmware, setFirmware] = useState<UploadItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFirmware = async () => {
      if (!uploadId) {
        setError('Firmware not found');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const upload = await getUploadById(Number(uploadId));
        if (!upload) {
          setError('Firmware not found');
          setFirmware(null);
          return;
        }

        setFirmware(upload);
      } catch {
        setError('Failed to load firmware');
      } finally {
        setIsLoading(false);
      }
    };

    loadFirmware();
  }, [uploadId]);

  const detailRows: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
    { label: 'ID', value: firmware?.id },
    { label: 'Version', value: firmware?.version_number },
    { label: 'Device Type', value: firmware?.device_type },
    { label: 'Emergency', value: firmware?.isEmergency ? 'Yes' : 'No' },
    { label: 'Description', value: firmware?.description },
    { label: 'Status', value: firmware?.status },
    { label: 'Uploaded By', value: firmware?.uploaded_by },
    { label: 'Upload Timestamp', value: firmware?.uploaded_timestamp },
    { label: 'Approved By', value: firmware?.approved_by },
    { label: 'Declined By', value: firmware?.declined_by },
    { label: 'Decline Comment', value: firmware?.declined_comment },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: COLORS.backgroundPrimary,
        color: COLORS.textPrimary,
      }}
    >
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          backgroundColor: COLORS.backgroundSecondary,
          borderRadius: '8px',
          border: `1px solid ${COLORS.borderPrimary}`,
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Firmware Details</h2>
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME, { state: { activeTab: 1 } })}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              border: `1px solid ${COLORS.borderPrimary}`,
              color: COLORS.textPrimary,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>

        {isLoading && <p style={{ margin: 0, color: COLORS.textMuted }}>Loading firmware...</p>}
        {error && <p style={{ margin: 0, color: COLORS.error }}>{error}</p>}

        {!isLoading && firmware && (
          <div style={{ border: `1px solid ${COLORS.borderPrimary}`, borderRadius: '8px', overflow: 'hidden' }}>
            {detailRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  borderBottom: `1px solid ${COLORS.borderPrimary}`,
                }}
              >
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: COLORS.backgroundTertiary,
                    fontWeight: 600,
                  }}
                >
                  {row.label}
                </div>
                <div style={{ padding: '0.75rem 1rem' }}>{row.value ?? '-'}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FirmwareDetailPage;
