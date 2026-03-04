import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

const UPLOAD_STATUS = {
  CURRENT: 'current',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const

type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS]

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

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(() => {
    const navigationState = location.state as { activeTab?: number } | null
    return typeof navigationState?.activeTab === 'number' ? navigationState.activeTab : 0
  })
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  // Table Headers
  const tableHeaders = ['ID', 'Version', 'Device Type', 'Emergency', 'Description']

  // Name of Tabs
  const tabs = ['Current', 'Pending', 'Rejected']
  const tabStatusMap: UploadStatus[] = [UPLOAD_STATUS.CURRENT, UPLOAD_STATUS.PENDING, UPLOAD_STATUS.REJECTED]
  const isPendingTab = tabStatusMap[activeTab] === UPLOAD_STATUS.PENDING

  // Minimum 1 empty rows
  const minRows = 1

  useEffect(() => {
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
  }, [activeTab])

  const tableRows = uploads.length >= minRows
    ? uploads
    : [...uploads, ...Array.from({ length: minRows - uploads.length }, () => null)]

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
    }}>
      {/* Header with SLB and Logout */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button 
          type="button" 
          onClick={() => navigate(ROUTES.HOME)}
          style = {{
            padding: '0.5rem 1.5rem',
            backgroundColor: COLORS.backgroundPrimary,
            border: 'none'
          }}
        >
          <img 
          src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
          alt="SLB Logo" 
          style={{ width: '100px', height: 'auto' }} 
          />
            
        </button>
        <div
          style = {{
            display: 'flex',
            gap: '1rem'
          }}>
        <button 
          type="button" 
          onClick={() => navigate(ROUTES.UPLOAD)}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: `1px solid ${COLORS.success}`,
            backgroundColor: 'transparent',
            color: COLORS.success,
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
        >
          Upload New Firmware
        </button>
        <button 
          type="button" 
          onClick={() => navigate(ROUTES.LOGIN)}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: `1px solid ${COLORS.danger}`,
            backgroundColor: 'transparent',
            color: COLORS.dangerText,
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          Logout
        </button>
        </div>
      </header>

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
              backgroundColor: activeTab === index ? COLORS.backgroundSecondary : COLORS.backgroundTertiary,
              color: activeTab === index ? COLORS.accentPrimary : COLORS.textMuted,
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
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: COLORS.textPrimary }}>{tabs[activeTab]}</h2>
        {isLoading && <p style={{ margin: 0, color: COLORS.textMuted }}>Loading uploads...</p>}
        {error && <p style={{ margin: 0, color: COLORS.error }}>{error}</p>}
        
        <div style={{ overflow: 'auto' }}>
          <table style={{ 
            borderCollapse: 'collapse',
            width: '100%',
            backgroundColor: COLORS.backgroundSecondary,
          }}>
            <thead>
              <tr>
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    style={{
                      border: `1px solid ${COLORS.borderPrimary}`,
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      backgroundColor: COLORS.backgroundTertiary,
                      color: COLORS.textPrimary,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
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
                    if (!upload || !isPendingTab) {
                      return
                    }

                    const detailRoute = ROUTES.FIRMWARE_DETAIL.replace(':uploadId', String(upload.id))
                    navigate(detailRoute)
                  }}
                  style={{ 
                    backgroundColor: rowIndex % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary,
                    cursor: upload && isPendingTab ? 'pointer' : 'default',
                  }}
                >
                  <td
                    style={{
                      border: `1px solid ${COLORS.borderPrimary}`,
                      padding: '0.75rem 1rem',
                      minHeight: '3rem',
                      textAlign: 'left',
                      color: COLORS.textPrimary,
                    }}
                  >
                    {upload?.id ?? ''}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${COLORS.borderPrimary}`,
                      padding: '0.75rem 1rem',
                      minHeight: '3rem',
                      textAlign: 'left',
                      color: COLORS.textPrimary,
                    }}
                  >
                    {upload?.version_number ?? ''}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${COLORS.borderPrimary}`,
                      padding: '0.75rem 1rem',
                      minHeight: '3rem',
                      textAlign: 'left',
                      color: COLORS.textPrimary,
                    }}
                  >
                    {upload?.device_type ?? ''}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${COLORS.borderPrimary}`,
                      padding: '0.75rem 1rem',
                      minHeight: '3rem',
                      textAlign: 'left',
                      color: COLORS.textPrimary,
                    }}
                  >
                    {upload?.isEmergency ? 'Yes' : upload ? 'No' : ''}
                  </td>
                  <td
                    style={{
                      border: `1px solid ${COLORS.borderPrimary}`,
                      padding: '0.75rem 1rem',
                      minHeight: '3rem',
                      textAlign: 'left',
                      color: COLORS.textPrimary,
                    }}
                  >
                    {upload?.description ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default HomePage