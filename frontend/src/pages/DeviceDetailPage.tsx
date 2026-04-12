import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import DeployHistory from '../components/DeployHistory'

type Device = {
  device_type: string
  version_number: string
  last_update: string
  location: string
  developer_manager: string
  serial_number: string
  description: string
  latitude: number | null
  longitude: number | null
}

type DeviceDetailLocationState = {
  device?: Device
  fromRoute?: string
} | null

const DeviceDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { serialNumber } = useParams<{ serialNumber: string }>()

  const navigationState = location.state as DeviceDetailLocationState
  const [device, setDevice] = useState<Device | null>(navigationState?.device ?? null)
  const [isLoading, setIsLoading] = useState(!navigationState?.device)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [error, setError] = useState('')
  const [acceptanceStatus, setAcceptanceStatus] = useState<boolean | null>(null)
  const [hasNoDeployments, setHasNoDeployments] = useState(false)

  const decodedSerial = useMemo(() => (serialNumber ? decodeURIComponent(serialNumber) : ''), [serialNumber])
  const backRoute = useMemo(() => {
    if (navigationState?.fromRoute) {
      return navigationState.fromRoute
    }
    return ROUTES.DEVICES_BIZMNG
  }, [navigationState?.fromRoute])

  useEffect(() => {
    if (device || !decodedSerial) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    fetch('/get_devices')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load devices')
        }
        return res.json() as Promise<Device[]>
      })
      .then((allDevices) => {
        const selected = allDevices.find((item) => item.serial_number === decodedSerial)
        if (!selected) {
          setError('Device not found')
          setDevice(null)
          return
        }
        setDevice(selected)
      })
      .catch(() => {
        setError('Failed to load device')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [decodedSerial, device])

  useEffect(() => {
    if (!decodedSerial) return
  
    fetch(`/device/${encodeURIComponent(decodedSerial)}/acceptance-status`)
      .then((res) => {
        if (res.status === 404) {
          setAcceptanceStatus(null)
          setHasNoDeployments(true)
          return null
        }
        if (!res.ok) throw new Error('Failed to fetch acceptance status')
        return res.json() as Promise<{ isAccepted: boolean | null }>
      })
      .then((data) => {
        if (!data) return
        setAcceptanceStatus(data.isAccepted)
      })
      .catch(() => {
        setAcceptanceStatus(null)
      })
  }, [decodedSerial])

  const detailRows: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Device Type', value: device?.device_type },
    { label: 'Firmware Version', value: device?.version_number },
    { label: 'Last Updated', value: device?.last_update },
    { label: 'Region', value: device?.location },
    { label: 'Developer Manager', value: device?.developer_manager },
    {
      label: 'Latitude',
      value: device?.latitude === null || device?.latitude === undefined ? '-' : String(device.latitude),
    },
    {
      label: 'Longitude',
      value: device?.longitude === null || device?.longitude === undefined ? '-' : String(device.longitude),
    },
    { label: 'Serial Number', value: device?.serial_number },
    { label: 'Description', value: device?.description },
    {
      label: 'Acceptance Status',
      value: (() => {
        if (hasNoDeployments) return 'No recent deployment'
        if (acceptanceStatus === true) return 'Accepted'
        if (acceptanceStatus === false) return 'Rejected'
        return 'Field/Shop Person did not review yet'
      })(),
    }, ]

  const handleConfirmRemove = async () => {
    if (!device || isRemoving) {
      return
    }

    setIsRemoving(true)
    setError('')

    try {
      const response = await fetch(`/remove_device/${encodeURIComponent(device.serial_number)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { detail?: string }
        throw new Error(payload.detail ?? 'Failed to remove device')
      }

      setShowRemoveConfirm(false)
      navigate(ROUTES.DEVICES_BIZMNG)
    } catch (removeError) {
      if (removeError instanceof Error) {
        setError(removeError.message)
      } else {
        setError('Failed to remove device')
      }
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        minWidth: '100%',
        padding: '2rem',
        backgroundColor: COLORS.backgroundPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.textPrimary,
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          zIndex: 900,
        }}
      />
      <main
        style={{
          width: '100%',
          maxWidth: '900px',
          backgroundColor: COLORS.backgroundSecondary,
          border: `1px solid ${COLORS.borderPrimary}`,
          borderRadius: '10px',
          boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '85vh',
          overflow: 'auto',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: COLORS.textPrimary }}>Device Information</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            
            {device ? (
              <>
              <DeployHistory serialNumber={device.serial_number} />
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(true)}
                disabled={isRemoving}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.danger}`,
                  backgroundColor: 'transparent',
                  color: COLORS.dangerText,
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                }}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(backRoute)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: `1px solid ${COLORS.accentPrimary}`,
                backgroundColor: 'transparent',
                color: COLORS.textPrimary,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>

        {isLoading ? <p style={{ margin: 0 }}>Loading device...</p> : null}
        {error ? <p style={{ margin: 0, color: COLORS.dangerText }}>{error}</p> : null}

        {!isLoading && !error && device ? (
          <div
            style={{
              border: `1px solid ${COLORS.borderPrimary}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {detailRows.map((row, index) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  borderBottom: index === detailRows.length - 1 ? 'none' : `1px solid ${COLORS.borderPrimary}`,
                  backgroundColor: index % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary,
                }}
              >
                <div style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>{row.label}</div>
                <div style={{ padding: '0.8rem 1rem', wordBreak: 'break-word' }}>{row.value || '-'}</div>
              </div>
            ))}
          </div>
        ) : null}
      </main>

      {showRemoveConfirm && device ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.backgroundSecondary,
              border: `1px solid ${COLORS.borderPrimary}`,
              borderRadius: '10px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              minWidth: '320px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: 0, color: COLORS.textPrimary, fontSize: '1.2rem' }}>
              Remove Device
            </h3>
            <p style={{ margin: 0, color: COLORS.textPrimary }}>
              Are you sure you want to remove the following device?
              <br />
              <br />
              Device Type: <strong>{device.device_type}</strong>
              <br />
              Serial Number: <strong>{device.serial_number}</strong>
              <br />
              Firmware Version: <strong>{device.version_number}</strong>
              <br />
              Region: <strong>{device.location}</strong>
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                  border: `1px solid ${COLORS.danger}`,
                  backgroundColor: 'transparent',
                  color: COLORS.dangerText,
                  fontWeight: 500,
                }}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemoving}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                  border: `1px solid ${COLORS.white}`,
                  backgroundColor: 'transparent',
                  color: COLORS.textPrimary,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DeviceDetailPage
