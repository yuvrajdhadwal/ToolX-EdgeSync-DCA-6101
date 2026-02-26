import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

const DeveloperPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  // Table Headers
  const tableHeaders = ['Last Updated', 'Firmware Version', 'Priority', 'Developer', 'Short Description']

  // Name of Tabs
  const tabs = ['Current Firmware', 'Pending Firmware', 'Rejected Firmware']

  // Minimum 3 empty rows
  const minRows = 3

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
    }}>
      {/* Header with SLB, Upload New Firmware, and Logout */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button 
          type="button" 
          onClick={() => navigate(ROUTES.DEVELOPERPAGE)}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: COLORS.accentPrimary,
            color: COLORS.white,
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
        >
          SLB
        </button>

        {/*Group Upload New Firmware & Logout at top right*/}
        <div style={{display: 'flex', gap: '0.75rem'}}>
          <button 
            type="button" 
            onClick={() => navigate(ROUTES.LOGIN)}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: '6px',
              border: `1px solid ${COLORS.success}`,
              backgroundColor: 'transparent',
              color: COLORS.success,
              fontWeight: 500,
              transition: 'all 0.2s',
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

    {/*Modified Dashboard header and tab nav*/}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COLORS.borderPrimary}`}}>
      <h1 style ={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: 700,
          color: COLORS.white,
          textAlign: 'left',
          marginBottom: '0.5rem',
        }}>
          Dashboard
      </h1>

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', gap: '4px', borderBottom: `3px solid ${COLORS.borderPrimary}`}}>
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
    </div>

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
              {Array.from({ length: minRows }).map((_, rowIndex) => (
                <tr key={`row-${rowIndex}`} style={{ 
                  backgroundColor: rowIndex % 2 === 0 ? COLORS.backgroundSecondary : COLORS.backgroundPrimary
                }}>
                  {tableHeaders.map((_, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={{
                        border: `1px solid ${COLORS.borderPrimary}`,
                        padding: '0.75rem 1rem',
                        minHeight: '3rem',
                        textAlign: 'left',
                        color: COLORS.textPrimary,
                      }}
                    >
                      {/* Empty cells for user input */}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default DeveloperPage