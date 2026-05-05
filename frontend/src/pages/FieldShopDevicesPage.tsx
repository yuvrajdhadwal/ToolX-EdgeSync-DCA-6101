import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'

interface Device {
  device_type: string;
  version_number: string;
  last_update: string;
  location: string;
  serial_number: string;
  description: string;
  developer_manager: string;
  latitude: number | null;
  longitude: number | null;
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

const FieldShopDevicesPage: React.FC = () => {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDeviceType, setSelectedDeviceType] = useState('All Device Types')

  const tableHeaders = ['Device Type', 'Firmware Version', 'Last Updated', 'Location', 'Serial Number', 'Description']
  const minRows = 3

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('/my-assigned-devices', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDevices(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load assigned devices.')
        setLoading(false)
      })
  }, [])

  const availableDeviceTypes = Array.from(
    new Set(devices.map(d => d.device_type).filter(Boolean))
  ).sort()

  const filteredDevices = selectedDeviceType === 'All Device Types'
    ? devices
    : devices.filter(d => d.device_type === selectedDeviceType)

  const rows = filteredDevices.length >= minRows
    ? filteredDevices
    : [...filteredDevices, ...Array(minRows - filteredDevices.length).fill(null)]

  const handleOpenDevice = (device: Device) => {
    navigate(ROUTES.DEVICE_DETAIL.replace(':serialNumber', encodeURIComponent(device.serial_number)), {
      state: { device, fromRoute: ROUTES.FIELD_SHOP_DEVICES },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      gap: 0,
      backgroundColor: COLORS.backgroundPrimary,
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        minHeight: '4.5rem',
        width: '100%',
        padding: 0,
        backgroundColor: COLORS.accentPrimary,
        color: COLORS.white,
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button
            type="button"
            onClick={() => navigate(ROUTES.FIELD_SHOP_DEVICES)}
            style={{ padding: '0 0.85rem', background: COLORS.accentPrimary, border: 'none', borderRight: `1px solid ${COLORS.white}`, height: '100%', display: 'flex', alignItems: 'center' }}
          >
            <img
              src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
              alt="SLB Logo"
              style={{ width: '100px', height: 'auto' }}
            />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', padding: 0, marginLeft: 'auto' }}>
          <Profile />
          <Logout />
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COLORS.borderPrimary}` }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: COLORS.textPrimary, marginBottom: '0.5rem' }}>
            My Assigned Devices
          </h1>
        </div>

        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem',
          padding: '2rem', backgroundColor: COLORS.backgroundSecondary,
          borderRadius: '8px', boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
        }}>
          {/* Device type filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.textPrimary }}>Devices</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="device-type-filter" style={{ color: COLORS.textPrimary, fontWeight: 500, whiteSpace: 'nowrap' }}>
                Device Type:
              </label>
              <select
                id="device-type-filter"
                value={selectedDeviceType}
                onChange={(e) => setSelectedDeviceType(e.target.value)}
                style={{
                  minWidth: '200px',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderPrimary}`,
                  backgroundColor: COLORS.backgroundPrimary,
                  color: COLORS.textPrimary,
                }}
              >
                <option value="All Device Types">All Device Types</option>
                {availableDeviceTypes.map(dt => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>
          </div>

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
                  <tr
                    key={rowIndex}
                    onClick={() => device && handleOpenDevice(device)}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary,
                      cursor: device ? 'pointer' : 'default',
                    }}
                  >
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
    </div>
  )
}

export default FieldShopDevicesPage