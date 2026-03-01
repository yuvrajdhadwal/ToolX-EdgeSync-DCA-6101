import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';
import { getUploadById, updateUploadStatus } from '../services/uploadService';
import { UPLOAD_STATUS, type UploadItem } from '../types/upload';

const FirmwareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams<{ uploadId: string }>();
  const [firmware, setFirmware] = useState<UploadItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const upload = await getUploadById(uploadId);
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

  const handleDecision = async (nextStatus: typeof UPLOAD_STATUS.CURRENT | typeof UPLOAD_STATUS.REJECTED) => {
    if (!uploadId) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updated = await updateUploadStatus(uploadId, nextStatus);
      if (!updated) {
        setError('Firmware not found');
        return;
      }

      navigate(ROUTES.HOME);
    } catch {
      setError('Failed to update firmware status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const detailRows: Array<{ label: string; value: string | undefined }> = [
    { label: 'ID', value: firmware?.id },
    { label: 'Date', value: firmware?.date },
    { label: 'Version', value: firmware?.version },
    { label: 'Priority', value: firmware?.priority },
    { label: 'Developer', value: firmware?.developer },
    { label: 'Short Description', value: firmware?.shortDescription },
    { label: 'Status', value: firmware?.status },
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
          <h2 style={{ margin: 0 }}>Pending Firmware Details</h2>
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
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
          <>
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

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision(UPLOAD_STATUS.CURRENT)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  backgroundColor: COLORS.success,
                  color: COLORS.white,
                  fontWeight: 600,
                }}
              >
                Accept Firmware
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision(UPLOAD_STATUS.REJECTED)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  backgroundColor: COLORS.danger,
                  color: COLORS.white,
                  fontWeight: 600,
                }}
              >
                Reject Firmware
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default FirmwareDetailPage;
