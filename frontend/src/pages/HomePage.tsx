import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { getHomeRouteFromToken, ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'

const UPLOAD_STATUS = {
  CURRENT: 'current',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const

type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]
type UserRole = 'developer' | 'developer_manager' | 'business_manager' | 'field_shop_professional' | null

type UploadItem = {
  id: number
  version_number: string
  device_type: string
  description: string | null
  isEmergency: boolean
  uploaded_by: number | null
  uploaded_timestamp: string | null
  approved_by: number | null
  declined_by: number | null
  declined_comment: string | null
  status: UploadStatus
}

const getFirmwareDeviceTypes = async (): Promise<string[]> => {
  const token = localStorage.getItem('token')
  const response = await fetch('/firmware-device-types', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch device types: ${response.statusText}`)
  }

  return response.json()
}

const getUploadsByStatus = async (status: UploadStatus): Promise<UploadItem[]> => {
  const token = localStorage.getItem('token')
  const response = await fetch(`/firmware/status/${status}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch firmware: ${response.statusText}`)
  }

  return response.json()
}

const getRoleFromToken = (): UserRole => {
  const token = localStorage.getItem('token')
  if (!token) {
    return null
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: UserRole }
    return payload.role ?? null
  } catch {
    return null
  }
}

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const role = getRoleFromToken()
  const canUploadFirmware = role === 'developer'
  const showFirmwareDashboard = role === 'developer' || role === 'developer_manager' || role === 'business_manager'
  const [activeTab, setActiveTab] = useState(() => {
    const navigationState = location.state as { activeTab?: number } | null
    return typeof navigationState?.activeTab === 'number' ? navigationState.activeTab : 0
  })
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [deviceTypes, setDeviceTypes] = useState<string[]>([])
  const [selectedDeviceType, setSelectedDeviceType] = useState('All Device Types')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const tableHeaders = ['ID', 'Version', 'Device Type', 'Emergency', 'Description']
  const tabs = ['Approved', 'Pending', 'Rejected']
  const tabStatusMap: UploadStatus[] = [UPLOAD_STATUS.CURRENT, UPLOAD_STATUS.PENDING, UPLOAD_STATUS.REJECTED]
  const minRows = 1

  useEffect(() => {
    if (!showFirmwareDashboard) {
      setUploads([])
      setDeviceTypes([])
      setSelectedDeviceType('All Device Types')
      setError('')
      setIsLoading(false)
      return
    }

    const loadUploads = async () => {
      setIsLoading(true)
      setError('')

      try {
        const status = tabStatusMap[activeTab]
        const records = await getUploadsByStatus(status)
        setUploads(records)
      } catch {
        setError('Failed to load uploads')
        setUploads([])
      } finally {
        setIsLoading(false)
      }
    }

    loadUploads()
  }, [activeTab, showFirmwareDashboard])

  useEffect(() => {
    if (!showFirmwareDashboard) {
      return
    }

    const loadDeviceTypes = async () => {
      try {
        const records = await getFirmwareDeviceTypes()
        setDeviceTypes(records)
      } catch {
        setDeviceTypes([])
      }
    }

    loadDeviceTypes()
  }, [showFirmwareDashboard])

  useEffect(() => {
    if (selectedDeviceType === 'All Device Types') {
      return
    }

    if (!deviceTypes.includes(selectedDeviceType)) {
      setSelectedDeviceType('All Device Types')
    }
  }, [deviceTypes, selectedDeviceType])

  const filteredUploads = selectedDeviceType === 'All Device Types'
    ? uploads
    : uploads.filter((upload) => upload.device_type === selectedDeviceType)

  const tableRows = filteredUploads.length >= minRows
    ? filteredUploads
    : [...filteredUploads, ...Array.from({ length: minRows - filteredUploads.length }, () => null)]


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
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          minHeight: '4.5rem',
          width: '100%',
          padding: '0 1.5rem 0 0',
          backgroundColor: COLORS.accentPrimary,
          color: COLORS.white,
        }}
      >
        {/* Left side - Home logo */}
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button 
            type="button" 
            onClick={() => navigate(getHomeRouteFromToken())}
            style = {{
              padding: '0 0.85rem',
              backgroundColor: COLORS.accentPrimary,
              border: 'none',
              borderRight: `1px solid ${COLORS.white}`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}

          >
            <img 
              src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
              alt="SLB Logo" 
              style={{ width: '100px', height: 'auto' }} 
            />
          </button>
        </div>

        {/* Right side - Role buttons, profile, logout */}
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', padding: 0 }}>
          {canUploadFirmware && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.UPLOAD)}
              style={{
                padding: '0 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                border: 'none',
                borderLeft: `1px solid ${COLORS.white}`,
                backgroundColor: 'transparent',
                color: COLORS.white,
                fontWeight: 500,
                transition: 'background-color 0.2s',
                height: '100%',
              }}
            >
              Upload New Firmware
            </button>
          )}
          <Profile />
          <Logout />
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          padding: '2rem',
        }}
      >

      {showFirmwareDashboard ? (
        <>
          {/* Tab Navigation */}
          <nav style={{ display: 'flex', gap: '4px', borderBottom: `3px solid ${COLORS.borderPrimary}` }}>
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(index)}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  border: `2px solid ${COLORS.borderPrimary}`,
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  backgroundColor: activeTab === index ? COLORS.backgroundPrimary : COLORS.accentPrimary,
                  color: activeTab === index ? COLORS.whiteMuted : COLORS.white,
                  fontWeight: activeTab === index ? 600 : 400,
                  position: 'relative',
                  top: activeTab === index ? '3px' : '0',
                  zIndex: activeTab === index ? 10 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Main Content Area */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              padding: '2rem',
              backgroundColor: COLORS.backgroundSecondary,
              borderRadius: '8px',
              boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.textPrimary }}>{tabs[activeTab]}</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <label htmlFor="device-type-filter" style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                  Device Type:
                </label>
                <select
                  id="device-type-filter"
                  value={selectedDeviceType}
                  onChange={(event) => setSelectedDeviceType(event.target.value)}
                  style={{
                    minWidth: '220px',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.borderPrimary}`,
                    backgroundColor: COLORS.backgroundPrimary,
                    color: COLORS.textPrimary,
                  }}
                >
                  <option value="All Device Types">All Device Types</option>
                  {deviceTypes.map((deviceType) => (
                    <option key={deviceType} value={deviceType}>
                      {deviceType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading && <p style={{ margin: 0, color: COLORS.textMuted }}>Loading uploads...</p>}
            {error && <p style={{ margin: 0, color: COLORS.error }}>{error}</p>}

            <div style={{ overflow: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', backgroundColor: COLORS.backgroundSecondary }}>
                <thead>
                  <tr>
                    {tableHeaders.map((header) => (
                      <th key={header} style={{
                        border: `1px solid ${COLORS.borderPrimary}`,
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        backgroundColor: COLORS.backgroundTertiary,
                        color: COLORS.textPrimary,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((upload, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      onClick={() => {
                        if (!upload) return
                        const detailRoute = ROUTES.FIRMWARE_DETAIL.replace(':uploadId', String(upload.id))
                        navigate(detailRoute, { state: { returnTab: activeTab } })
                      }}
                      style={{
                        backgroundColor: rowIndex % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary,
                        cursor: upload ? 'pointer' : 'default',
                      }}
                    >
                      <td style={{ border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem', minHeight: '3rem', textAlign: 'left', color: COLORS.textPrimary }}>
                        {upload?.id ?? ''}
                      </td>
                      <td style={{ border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem', minHeight: '3rem', textAlign: 'left', color: COLORS.textPrimary }}>
                        {upload?.version_number ?? ''}
                      </td>
                      <td style={{ border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem', minHeight: '3rem', textAlign: 'left', color: COLORS.textPrimary }}>
                        {upload?.device_type ?? ''}
                      </td>
                      <td style={{ border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem', minHeight: '3rem', textAlign: 'left', color: COLORS.textPrimary }}>
                        {upload?.isEmergency ? 'Yes' : upload ? 'No' : ''}
                      </td>
                      <td style={{ border: `1px solid ${COLORS.borderPrimary}`, padding: '0.75rem 1rem', minHeight: '3rem', textAlign: 'left', color: COLORS.textPrimary }}>
                        {upload?.description ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </>
      ) : (
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '2rem',
          backgroundColor: COLORS.backgroundSecondary,
          borderRadius: '8px',
          boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.textPrimary }}>Dashboard</h2>
          <p style={{ margin: 0, color: COLORS.textMuted }}>No firmware dashboard is available for your role.</p>
        </main>
      )}
      </div>
    </div>
  )
}

export default HomePage
