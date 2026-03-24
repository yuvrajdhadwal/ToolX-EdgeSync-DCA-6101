import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Logout from '../components/Logout'
import Profile from '../components/Profile'

interface Device {
  device_type: string;
  version_number: string;
  last_update: string;
  location: string;
  serial_number: string;
  description: string;
}

const tdStyle = {
  border: `1px solid ${COLORS.borderPrimary}`,
  padding: '0.75rem 0.5rem',
  color: COLORS.textPrimary,
  height: '2rem',
  minWidth: 0,
  textAlign: 'center' as const,
  wordBreak: 'break-word' as const,
}

const BizMngDevicesPage: React.FC = () => {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDevice, setConfirmDevice] = useState<Device | null>(null)

  const tableHeaders = ['Device Type', 'Firmware Version', 'Last Updated', 'Region', 'Serial Number', 'Device Description', 'Remove']
  const minRows = 3

  const handleOpenDevice = (device: Device) => {
    navigate(ROUTES.DEVICE_DETAIL.replace(':serialNumber', encodeURIComponent(device.serial_number)), {
      state: { device },
    })
  }

  const handleDelete = async (serial_number: string) => {
    try {
      const response = await fetch(`/remove_device/${serial_number}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setDevices(prev => prev.filter(d => d.serial_number !== serial_number))
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to delete device.')
      }
    } catch {
      setError('An error occurred while deleting the device.')
    } finally {
      setConfirmDevice(null)
    }
  }

  useEffect(() => {
    fetch('/get_devices')
      .then(res => res.json())
      .then(data => {
        setDevices(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load devices.')
        setLoading(false)
      })
  }, [])

  const rows = devices.length >= minRows ? devices : [
    ...devices,
    ...Array(minRows - devices.length).fill(null)
  ]

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
    }}>
      {/* Header with SLB */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={() => navigate(ROUTES.BIZMNGPAGE)}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: COLORS.backgroundPrimary, border: 'none' }}
          >
            <img 
              src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
              alt="SLB Logo" 
              style={{ width: '100px', height: 'auto' }} 
            />
          </button>
          <Profile />
        </div>
              
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            type="button" 
            onClick={() => navigate(ROUTES.ADD_DEVICES)}
            style={{
              padding: '0.5rem 1.5rem', fontSize: '1rem', cursor: 'pointer',
              borderRadius: '6px', border: `1px solid ${COLORS.success}`,
              backgroundColor: 'transparent', color: COLORS.success, fontWeight: 500,
            }}
          >
            Add New Device
          </button>
          <Logout/>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COLORS.borderPrimary}` }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: COLORS.white, marginBottom: '0.5rem' }}>
          Dashboard
        </h1>
      </div>

      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem',
        padding: '2rem', backgroundColor: COLORS.backgroundSecondary,
        borderRadius: '8px', boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.textPrimary }}>All Active Devices</h2>

        {loading && <p style={{ color: COLORS.textMuted }}>Loading devices...</p>}
        {error && <p style={{ color: COLORS.dangerText }}>{error}</p>}

        <div style={{ overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: COLORS.backgroundSecondary }}>
            <thead>
              <tr>
                {tableHeaders.map(header => (
                  <th key={header} style={{
                    border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem',
                    textAlign: 'center',
                    backgroundColor: COLORS.backgroundTertiary,
                    color: COLORS.textPrimary, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((device, rowIndex) => (
                <tr key={rowIndex} style={{
                  backgroundColor: rowIndex % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary,
                  cursor: device ? 'pointer' : 'default',
                }}>
                  <td style={tdStyle} onClick={() => device && handleOpenDevice(device)}>{device?.device_type ?? ''}</td>
                  <td style={tdStyle} onClick={() => device && handleOpenDevice(device)}>{device?.version_number ?? ''}</td>
                  <td style={tdStyle} onClick={() => device && handleOpenDevice(device)}>{device?.last_update ?? ''}</td>
                  <td style={tdStyle} onClick={() => device && handleOpenDevice(device)}>{device?.location ?? ''}</td>
                  <td style={tdStyle} onClick={() => device && handleOpenDevice(device)}>{device?.serial_number ?? ''}</td>
                  <td style={tdStyle} onClick={() => device && handleOpenDevice(device)}>{device?.description ?? ''}</td>
                  <td style={tdStyle}>
                    {device && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setConfirmDevice(device)
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          border: `1px solid ${COLORS.danger}`,
                          backgroundColor: 'transparent',
                          color: COLORS.dangerText,
                          fontWeight: 500,
                        }}
                      >
                        X
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmDevice && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.borderPrimary}`,
            borderRadius: '10px',
            padding: '2rem',
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
            minWidth: '320px', textAlign: 'center',
          }}>
            <h3 style={{ margin: 0, color: COLORS.textPrimary, fontSize: '1.2rem' }}>
              Remove Device
            </h3>
            <p style={{ margin: 0, color: COLORS.textPrimary }}>
              Are you sure you want to remove the following device?
              <br/>
              <br/>
              Device Type: <strong>{confirmDevice.device_type}</strong>
              <br/>
              Serial Number: <strong>{confirmDevice.serial_number}</strong>
              <br/>
              Firmware Version: <strong>{confirmDevice.version_number}</strong>
              <br/>
              Region: <strong>{confirmDevice.location}</strong>
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleDelete(confirmDevice.serial_number)}
                style={{
                  padding: '0.5rem 1.5rem', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${COLORS.danger}`,
                  backgroundColor: 'transparent', color: COLORS.dangerText, fontWeight: 500,
                }}
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmDevice(null)}
                style={{
                  padding: '0.5rem 1.5rem', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${COLORS.white}`,
                  backgroundColor: 'transparent', color: COLORS.textPrimary, fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BizMngDevicesPage