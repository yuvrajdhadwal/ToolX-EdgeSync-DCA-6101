import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

interface Device {
  device_type: string;
  version_number: string;
  last_update: string;
  location: string;
  serial_number: string;
  description: string;
}

const BizMngDevicesPage: React.FC = () => {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tableHeaders = ['Device Type', 'Firmware Version', 'Last Updated', 'Region', 'Serial Number', 'Device Description']
  const minRows = 3

  const tdStyle = {
    border: `1px solid ${COLORS.borderPrimary}`,
    padding: '0.75rem 1rem',
    color: COLORS.textPrimary,
    height: '2rem',
    minWidth: '8rem',
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

        <div style={{ overflow: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: COLORS.backgroundSecondary }}>
            <thead>
              <tr>
                {tableHeaders.map(header => (
                  <th key={header} style={{
                    border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem',
                    textAlign: 'left', backgroundColor: COLORS.backgroundTertiary,
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
                  backgroundColor: rowIndex % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary
                }}>
                  <td style={tdStyle}>{device?.device_type ?? ''}</td>
                  <td style={tdStyle}>{device?.version_number ?? ''}</td>
                  <td style={tdStyle}>{device?.last_update ?? ''}</td>
                  <td style={tdStyle}>{device?.location ?? ''}</td>
                  <td style={tdStyle}>{device?.serial_number ?? ''}</td>
                  <td style={tdStyle}>{device?.description ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default BizMngDevicesPage