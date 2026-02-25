import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  // Table Headers
  const tableHeaders = ['Date', 'Version', 'Priority', 'Developer', 'Short Description']

  // Name of Tabs
  const tabs = ['Current', 'Pending', 'Rejected']

  // Minimum 3 empty rows
  const minRows = 3

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: '#0d1117',
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
          onClick={() => navigate('/home')}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#238636',
            color: '#ffffff',
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
        >
          SLB
        </button>
        <button 
          type="button" 
          onClick={() => navigate('/login')}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: '1px solid #da3633',
            backgroundColor: 'transparent',
            color: '#f85149',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          Logout
        </button>
      </header>

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', gap: '4px', borderBottom: '3px solid #30363d' }}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(index)}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              cursor: 'pointer',
              border: '2px solid #30363d',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              backgroundColor: activeTab === index ? '#161b22' : '#21262d',
              color: activeTab === index ? '#58a6ff' : '#8b949e',
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
          backgroundColor: '#161b22',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#c9d1d9' }}>{tabs[activeTab]}</h2>
        
        <div style={{ overflow: 'auto' }}>
          <table style={{ 
            borderCollapse: 'collapse',
            width: '100%',
            backgroundColor: '#161b22',
          }}>
            <thead>
              <tr>
                {tableHeaders.map((header) => (
                  <th
                    key={header}
                    style={{
                      border: '1px solid #30363d',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      backgroundColor: '#21262d',
                      color: '#c9d1d9',
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
                  backgroundColor: rowIndex % 2 === 0 ? '#161b22' : '#0d1117'
                }}>
                  {tableHeaders.map((_, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={{
                        border: '1px solid #30363d',
                        padding: '0.75rem 1rem',
                        minHeight: '3rem',
                        textAlign: 'left',
                        color: '#c9d1d9',
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

export default HomePage