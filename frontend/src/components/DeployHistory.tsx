import { useState } from 'react'
import { COLORS } from '../constants/colors'

interface DeployRecord {
  id: number;
  firmware_version: string;
  timestamp: string;
  isActive: boolean;
}

interface Props {
  serialNumber: string;
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

const DeployHistory: React.FC<Props> = ({ serialNumber }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<DeployRecord[]>([])
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    setIsOpen(true)
    setLoading(true)
    try {
      const res = await fetch(`/device/${encodeURIComponent(serialNumber)}/deploy-history`)
      const data = await res.json()
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setHistory([])
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          padding: '0.5rem 1rem', cursor: 'pointer',
          borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`,
          backgroundColor: 'transparent', color: COLORS.white
        }}
      >
        History
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: COLORS.backgroundSecondary, border: `1px solid ${COLORS.borderPrimary}`,
            borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column',
            gap: '1.5rem', minWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: COLORS.textPrimary }}>
                Deploy History — {serialNumber}
              </h3>
              <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '0.5rem 1.5rem', borderRadius: '6px',
                cursor: 'pointer', border: `1px solid ${COLORS.white}`,
                backgroundColor: 'transparent', color: COLORS.white, fontWeight: 500,
              }}
            >
              Close
            </button>
            </div>
            
            {loading ? (
              <p style={{ color: COLORS.textMuted }}>Loading...</p>
            ) : history.length === 0 ? (
              <p style={{ color: COLORS.textMuted }}>No deployment history found.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {['Deploy ID', 'Firmware Version', 'Timestamp', 'Status'].map(h => (
                      <th key={h} style={{
                        border: `1px solid ${COLORS.borderPrimary}`, padding: '0.5rem',
                        backgroundColor: COLORS.backgroundTertiary, color: COLORS.textPrimary,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td style={tdStyle}>{record.id}</td>
                      <td style={tdStyle}>{record.firmware_version}</td>
                      <td style={tdStyle}>{record.timestamp}</td>
                      <td style={tdStyle}>
                        <span style={{ color: record.isActive ? COLORS.success : COLORS.textMuted }}>
                          {record.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default DeployHistory