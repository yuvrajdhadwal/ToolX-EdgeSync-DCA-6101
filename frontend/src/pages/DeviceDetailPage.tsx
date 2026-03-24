import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

type Device = {
  device_type: string
  version_number: string
  last_update: string
  location: string
  serial_number: string
  description: string
}

type DeviceDetailLocationState = {
  device?: Device
} | null

const DeviceDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { serialNumber } = useParams<{ serialNumber: string }>()

  const navigationState = location.state as DeviceDetailLocationState
  const [device, setDevice] = useState<Device | null>(navigationState?.device ?? null)
  const [isLoading, setIsLoading] = useState(!navigationState?.device)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')

  const decodedSerial = useMemo(() => (serialNumber ? decodeURIComponent(serialNumber) : ''), [serialNumber])

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

  const detailRows: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Device Type', value: device?.device_type },
    { label: 'Firmware Version', value: device?.version_number },
    { label: 'Last Updated', value: device?.last_update },
    { label: 'Region', value: device?.location },
    { label: 'Serial Number', value: device?.serial_number },
    { label: 'Description', value: device?.description },
  ]

  const handleRemove = async () => {
    if (!device || isRemoving) {
      return
    }

    const confirmed = window.confirm(`Remove device ${device.serial_number}?`)
    if (!confirmed) {
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
        color: COLORS.textPrimary,
      }}
    >
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          backgroundColor: COLORS.backgroundSecondary,
          border: `1px solid ${COLORS.borderPrimary}`,
          borderRadius: '10px',
          boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: COLORS.textPrimary }}>Device Information</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {device ? (
              <button
                type="button"
                onClick={handleRemove}
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
            ) : null}
            <button
              type="button"
              onClick={() => navigate(ROUTES.DEVICES_BIZMNG)}
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
    </div>
  )
}

export default DeviceDetailPage
