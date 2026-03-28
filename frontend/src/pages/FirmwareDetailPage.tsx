import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { COLORS } from '../constants/colors';
import { getHomeRouteFromToken, ROUTES } from '../constants/routes';

type UploadStatus = 'current' | 'pending' | 'rejected' | 'deployed';

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

type ApproveFirmwarePayload = {
  confirmation_text: string;
};

type CompatibleDevice = {
  serial_number: string;
  device_type: string;
  location: string;
  already_deployed: boolean;
};

const downloadFirmware = async (firmwareId: number) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/firmware/${firmwareId}/download`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('Failed to download firmware');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `firmware_${firmwareId}.bin`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

type UserLookupResponse = {
  id: number;
  username: string;
};

const getUploadById = async (uploadId: number): Promise<UploadItem | null> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/firmware/${uploadId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to fetch firmware: ${response.statusText}`);
  return response.json();
};

const getUsernameById = async (userId: number): Promise<string> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/users/${userId}/username`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch username');
  const payload = await response.json() as UserLookupResponse;
  return payload.username;
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

const approveUpload = async (uploadId: number, payload: ApproveFirmwarePayload): Promise<UploadItem> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/firmware/${uploadId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail ?? 'Failed to approve firmware');
  }
  return response.json();
};

const loadCompatibleDevices = async (firmwareId: number): Promise<CompatibleDevice[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/firmware/${firmwareId}/compatible-devices`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch compatible devices');
  return response.json();
};

const getUsernameFromToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
    return payload.sub ?? '';
  } catch {
    return '';
  }
};

const getRoleFromToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
    return payload.role ?? '';
  } catch {
    return '';
  }
};

const FirmwareDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = getRoleFromToken();
  const navigationState = location.state as { returnTab?: number } | null;
  const returnTab = typeof navigationState?.returnTab === 'number' ? navigationState.returnTab : 1;
  const { uploadId } = useParams<{ uploadId: string }>();
  const [firmware, setFirmware] = useState<UploadItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [showApprovePopup, setShowApprovePopup] = useState(false);
  const [showDeployPopup, setShowDeployPopup] = useState(false);
  const [rejectingManager, setRejectingManager] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveConfirmationText, setApproveConfirmationText] = useState('');
  const [compatibleDevices, setCompatibleDevices] = useState<CompatibleDevice[]>([]);
  const [selectedSerial, setSelectedSerial] = useState('');
  const [deployError, setDeployError] = useState('');
  const [deploySuccess, setDeploySuccess] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [resolvedUsernames, setResolvedUsernames] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const canModerateFirmware = userRole === 'developer_manager' && firmware?.status === 'pending';
  const canDeployFirmware = userRole === 'business_manager' && firmware?.status === 'current';

  const getReturnRoute = () => {
    if (userRole === 'business_manager') return ROUTES.HOME;
    return getHomeRouteFromToken();
  };

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

  useEffect(() => {
    if (!firmware) return;

    const userIds = [firmware.uploaded_by, firmware.approved_by, firmware.declined_by]
      .filter((id): id is number => typeof id === 'number');

    const missingIds = Array.from(new Set(userIds)).filter((id) => !resolvedUsernames[id]);
    if (missingIds.length === 0) return;

    const loadUsernames = async () => {
      const resolvedEntries = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const username = await getUsernameById(id);
            return [id, username] as const;
          } catch {
            return [id, String(id)] as const;
          }
        }),
      );
      setResolvedUsernames((previous) => {
        const updated = { ...previous };
        resolvedEntries.forEach(([id, username]) => { updated[id] = username; });
        return updated;
      });
    };
    loadUsernames();
  }, [firmware, resolvedUsernames]);

  const getDisplayNameById = (userId: number | null | undefined): string => {
    if (typeof userId !== 'number') return '-';
    return resolvedUsernames[userId] ?? String(userId);
  };

  const detailRows: Array<{ label: string; value: string | number | boolean | null | undefined }> = [
    { label: 'ID', value: firmware?.id },
    { label: 'Version', value: firmware?.version_number },
    { label: 'Device Type', value: firmware?.device_type },
    { label: 'Emergency', value: firmware?.isEmergency ? 'Yes' : 'No' },
    { label: 'Description', value: firmware?.description },
    { label: 'Status', value: firmware?.status },
    { label: 'Uploaded By', value: getDisplayNameById(firmware?.uploaded_by) },
    { label: 'Upload Timestamp', value: firmware?.uploaded_timestamp },
    { label: 'Approved By', value: getDisplayNameById(firmware?.approved_by) },
    { label: 'Declined By', value: getDisplayNameById(firmware?.declined_by) },
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
    if (!firmware) return;
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
      navigate(getReturnRoute(), { state: { activeTab: 2 } });
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : 'Failed to reject firmware');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!firmware) return;
    try {
      await downloadFirmware(firmware.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleApproveConfirm = async () => {
    if (!firmware) return;
    if (approveConfirmationText.trim().toUpperCase() !== 'CONFIRM') {
      setError('Type CONFIRM to approve firmware');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await approveUpload(firmware.id, { confirmation_text: approveConfirmationText.trim() });
      navigate(getReturnRoute(), { state: { activeTab: 0 } });
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Failed to approve firmware');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeployConfirm = async () => {
    if (!firmware || !selectedSerial) return;
    setIsDeploying(true);
    setDeployError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/firmware/${firmware.id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ serial_number: selectedSerial }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail ?? 'Failed to deploy firmware');
      }
      setDeploySuccess(`Firmware successfully deployed to ${selectedSerial}`);
      const updated = await loadCompatibleDevices(firmware.id);
      setCompatibleDevices(updated);
      setSelectedSerial('');
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        minWidth: '100%',
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {canDeployFirmware && (
              <button
                type="button"
                onClick={async () => {
                  setShowDeployPopup(true);
                  setDeployError('');
                  setDeploySuccess('');
                  try {
                    const devices = await loadCompatibleDevices(firmware!.id);
                    setCompatibleDevices(devices);
                  } catch {
                    setDeployError('Failed to load compatible devices');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: COLORS.success,
                  border: 'none',
                  color: COLORS.white,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Deploy
              </button>
            )}
            {!isLoading && firmware && (
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: COLORS.backgroundTertiary,
                  border: `1px solid ${COLORS.borderPrimary}`,
                  color: COLORS.textPrimary,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Download
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(getReturnRoute(), { state: { activeTab: returnTab } })}
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
        </div>

        {isLoading && <p style={{ margin: 0, color: COLORS.textMuted }}>Loading firmware...</p>}
        {error && <p style={{ margin: 0, color: COLORS.error }}>{error}</p>}

        {!isLoading && firmware && (
          <>
            <div style={{ border: `1px solid ${COLORS.borderPrimary}`, borderRadius: '8px', overflow: 'hidden' }}>
              {detailRows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr',
                    borderBottom: `1px solid ${COLORS.borderPrimary}`,
                  }}
                >
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: COLORS.backgroundTertiary, fontWeight: 600 }}>
                    {row.label}
                  </div>
                  <div style={{ padding: '0.75rem 1rem' }}>{row.value ?? '-'}</div>
                </div>
              ))}
            </div>

            {canModerateFirmware && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowApprovePopup(true)}
                  disabled={isSubmitting || firmware.status !== 'pending'}
                  style={{
                    padding: '0.65rem 1.25rem', borderRadius: '6px', border: 'none',
                    cursor: isSubmitting || firmware.status !== 'pending' ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || firmware.status !== 'pending' ? 0.6 : 1,
                    backgroundColor: COLORS.success, color: COLORS.white, fontWeight: 600,
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectPopup(true)}
                  disabled={isSubmitting || firmware.status !== 'pending'}
                  style={{
                    padding: '0.65rem 1.25rem', borderRadius: '6px', border: 'none',
                    cursor: isSubmitting || firmware.status !== 'pending' ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || firmware.status !== 'pending' ? 0.6 : 1,
                    backgroundColor: COLORS.danger, color: COLORS.white, fontWeight: 600,
                  }}
                >
                  Reject
                </button>
              </div>
            )}

            {/* Approve Modal */}
            {canModerateFirmware && showApprovePopup && (
              <div style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', zIndex: 1000,
              }}>
                <div style={{
                  width: '100%', maxWidth: '520px',
                  backgroundColor: COLORS.backgroundSecondary,
                  border: `1px solid ${COLORS.borderPrimary}`,
                  borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${COLORS.borderPrimary}` }}>
                    <h3 style={{ margin: 0, color: COLORS.textPrimary }}>Approve Pending Firmware</h3>
                  </div>
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ margin: 0, color: COLORS.textMuted }}>
                      Type <strong>CONFIRM</strong> to approve this pending firmware upload.
                    </p>
                    <input
                      value={approveConfirmationText}
                      onChange={(event) => setApproveConfirmationText(event.target.value)}
                      placeholder="Type CONFIRM"
                      style={{
                        padding: '0.6rem 0.75rem', borderRadius: '6px',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary,
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                    padding: '1rem 1.25rem', borderTop: `1px solid ${COLORS.borderPrimary}`,
                  }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => { setShowApprovePopup(false); setApproveConfirmationText(''); setError(''); }}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '6px',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: 'transparent', color: COLORS.textPrimary,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApproveConfirm}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '6px', border: 'none',
                        backgroundColor: COLORS.success, color: COLORS.white,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600,
                      }}
                    >
                      {isSubmitting ? 'Confirming...' : 'Confirm Approval'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reject Modal */}
            {canModerateFirmware && showRejectPopup && (
              <div style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', zIndex: 1000,
              }}>
                <div style={{
                  width: '100%', maxWidth: '760px', maxHeight: '90vh',
                  backgroundColor: COLORS.backgroundSecondary,
                  border: `1px solid ${COLORS.borderPrimary}`,
                  borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${COLORS.borderPrimary}` }}>
                    <h3 style={{ margin: 0, color: COLORS.textPrimary }}>Reject Pending Firmware</h3>
                  </div>
                  <div style={{
                    padding: '1rem 1.25rem', overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                  }}>
                    {rejectFields.map((field) => (
                      <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ color: COLORS.textMuted }}>{field.label}</label>
                        <input
                          readOnly
                          value={field.value}
                          style={{
                            padding: '0.6rem 0.75rem', borderRadius: '6px',
                            border: `1px solid ${COLORS.borderPrimary}`,
                            backgroundColor: COLORS.backgroundTertiary, color: COLORS.textPrimary,
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
                          padding: '0.6rem 0.75rem', borderRadius: '6px',
                          border: `1px solid ${COLORS.borderPrimary}`,
                          backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary,
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
                          padding: '0.6rem 0.75rem', borderRadius: '6px',
                          border: `1px solid ${COLORS.borderPrimary}`,
                          backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary,
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                    padding: '1rem 1.25rem', borderTop: `1px solid ${COLORS.borderPrimary}`,
                  }}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => { setShowRejectPopup(false); setRejectionReason(''); setError(''); }}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '6px',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: 'transparent', color: COLORS.textPrimary,
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
                        padding: '0.55rem 1rem', borderRadius: '6px', border: 'none',
                        backgroundColor: COLORS.danger, color: COLORS.white,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600,
                      }}
                    >
                      {isSubmitting ? 'Confirming...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Deploy Modal */}
            {showDeployPopup && (
              <div style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', zIndex: 1000,
              }}>
                <div style={{
                  width: '100%', maxWidth: '560px',
                  backgroundColor: COLORS.backgroundSecondary,
                  border: `1px solid ${COLORS.borderPrimary}`,
                  borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${COLORS.borderPrimary}` }}>
                    <h3 style={{ margin: 0, color: COLORS.textPrimary }}>Deploy Firmware</h3>
                  </div>
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ margin: 0, color: COLORS.textMuted }}>
                      Select a compatible device to deploy <strong>{firmware?.version_number}</strong> ({firmware?.device_type}):
                    </p>
                    {compatibleDevices.length === 0 ? (
                      <p style={{ color: COLORS.textMuted }}>No compatible devices found.</p>
                    ) : (
                      <select
                        value={selectedSerial}
                        onChange={(e) => setSelectedSerial(e.target.value)}
                        style={{
                          padding: '0.6rem 0.75rem', borderRadius: '6px',
                          border: `1px solid ${COLORS.borderPrimary}`,
                          backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary,
                        }}
                      >
                        <option value=''>Select a device...</option>
                        {compatibleDevices.map((device) => (
                          <option
                            key={device.serial_number}
                            value={device.serial_number}
                            disabled={device.already_deployed}
                          >
                            {device.serial_number} — {device.location}
                            {device.already_deployed ? ' (already deployed)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {deployError && <p style={{ margin: 0, color: COLORS.dangerText }}>{deployError}</p>}
                    {deploySuccess && <p style={{ margin: 0, color: COLORS.success }}>{deploySuccess}</p>}
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                    padding: '1rem 1.25rem', borderTop: `1px solid ${COLORS.borderPrimary}`,
                  }}>
                    <button
                      type="button"
                      onClick={() => { setShowDeployPopup(false); setSelectedSerial(''); setDeployError(''); setDeploySuccess(''); }}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '6px',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: 'transparent', color: COLORS.textPrimary, cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={isDeploying || !selectedSerial}
                      onClick={handleDeployConfirm}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '6px', border: 'none',
                        backgroundColor: COLORS.success, color: COLORS.white,
                        cursor: isDeploying || !selectedSerial ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        opacity: isDeploying || !selectedSerial ? 0.6 : 1,
                      }}
                    >
                      {isDeploying ? 'Deploying...' : 'Confirm Deploy'}
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