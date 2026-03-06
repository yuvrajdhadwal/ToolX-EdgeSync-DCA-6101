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

type RejectFirmwarePayload = {
  rejecting_manager_username: string;
  rejection_reason: string;
};

const getUploadById = async (uploadId: number): Promise<UploadItem | null> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/firmware/${uploadId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch firmware: ${response.statusText}`);
  }

  return response.json();
};

const rejectUpload = async (uploadId: number, payload: RejectFirmwarePayload): Promise<UploadItem> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/firmware/${uploadId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? 'Failed to reject firmware');
  }

  return response.json();
};

const getUsernameFromToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) {
    return '';
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
    return payload.sub ?? '';
  } catch {
    return '';
  }
};

const FirmwareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams<{ uploadId: string }>();
  const [firmware, setFirmware] = useState<UploadItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [rejectingManager, setRejectingManager] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
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

  useEffect(() => {
    setRejectingManager(getUsernameFromToken());
  }, []);

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

  const rejectFields: Array<{ label: string; value: string }> = [
    { label: 'Firmware ID', value: firmware ? String(firmware.id) : '' },
    { label: 'Version', value: firmware?.version_number ?? '' },
    { label: 'Device Type', value: firmware?.device_type ?? '' },
    { label: 'Emergency', value: firmware?.isEmergency ? 'Yes' : 'No' },
    { label: 'Description', value: firmware?.description ?? '' },
    { label: 'Current Status', value: firmware?.status ?? '' },
  ];

  const handleRejectConfirm = async () => {
    if (!firmware) {
      return;
    }

    if (!rejectingManager.trim() || !rejectionReason.trim()) {
      setError('Rejecting manager and rejection reason are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await rejectUpload(firmware.id, {
        rejecting_manager_username: rejectingManager.trim(),
        rejection_reason: rejectionReason.trim(),
      });
      navigate(ROUTES.HOME, { state: { activeTab: 2 } });
    } catch (rejectError) {
      if (rejectError instanceof Error) {
        setError(rejectError.message);
      } else {
        setError('Failed to reject firmware');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
                onClick={() => setShowRejectPopup(true)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: COLORS.danger,
                  color: COLORS.white,
                  fontWeight: 600,
                }}
              >
                Reject
              </button>
              <button
                type="button"
                disabled
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                  backgroundColor: COLORS.success,
                  color: COLORS.white,
                  fontWeight: 600,
                }}
              >
                Accept (Coming Soon)
              </button>
            </div>

            {showRejectPopup && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '760px',
                    maxHeight: '90vh',
                    backgroundColor: COLORS.backgroundSecondary,
                    border: `1px solid ${COLORS.borderPrimary}`,
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: `1px solid ${COLORS.borderPrimary}`,
                    }}
                  >
                    <h3 style={{ margin: 0, color: COLORS.textPrimary }}>Reject Pending Firmware</h3>
                  </div>

                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    {rejectFields.map((field) => (
                      <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ color: COLORS.textMuted }}>{field.label}</label>
                        <input
                          readOnly
                          value={field.value}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: '6px',
                            border: `1px solid ${COLORS.borderPrimary}`,
                            backgroundColor: COLORS.backgroundTertiary,
                            color: COLORS.textPrimary,
                          }}
                        />
                      </div>
                    ))}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ color: COLORS.textMuted }}>Rejecting Developer Manager</label>
                      <input
                        value={rejectingManager}
                        onChange={(event) => setRejectingManager(event.target.value)}
                        placeholder="Developer manager username"
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          border: `1px solid ${COLORS.borderPrimary}`,
                          backgroundColor: COLORS.backgroundPrimary,
                          color: COLORS.textPrimary,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ color: COLORS.textMuted }}>Reason for Rejection</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        placeholder="Provide rejection reason"
                        rows={4}
                        style={{
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          border: `1px solid ${COLORS.borderPrimary}`,
                          backgroundColor: COLORS.backgroundPrimary,
                          color: COLORS.textPrimary,
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.75rem',
                      padding: '1rem 1.25rem',
                      borderTop: `1px solid ${COLORS.borderPrimary}`,
                    }}
                  >
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setShowRejectPopup(false);
                        setRejectionReason('');
                        setError('');
                      }}
                      style={{
                        padding: '0.55rem 1rem',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: 'transparent',
                        color: COLORS.textPrimary,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRejectConfirm}
                      style={{
                        padding: '0.55rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: COLORS.danger,
                        color: COLORS.white,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {isSubmitting ? 'Confirming...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FirmwareDetailPage;
