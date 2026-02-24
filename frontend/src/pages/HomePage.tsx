import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  // Table Headers
  const tableHeaders = ['Date', 'Version', 'Priority', 'Developer', 'Short Description']


  // Name of Tabs
  const tabs = ['Current', 'Pending', 'Rejected']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <button type="button" onClick={() => navigate('/home')}>
          SLB
        </button>
        <button type="button" onClick={() => navigate('/login')}>
          Logout
        </button>
      </header>

      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(index)}
            style={{
              fontWeight: activeTab === index ? 700 : 400,
              borderBottom: activeTab === index ? '2px solid currentColor' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <h2>{tabs[activeTab]}</h2>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {tableHeaders.map((header) => (
                <th
                  key={header}
                  style={{
                    border: '1px solid #000',
                    minWidth: '8rem',
                    height: '3rem',
                    textAlign: 'center',
                    padding: '0 0.5rem',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {Array.from({ length: 5 }).map((__, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}`}
                    style={{
                      border: '1px solid #000',
                      width: '3rem',
                      height: '3rem',
                      textAlign: 'center',
                    }}
                  >
                    {rowIndex + 1},{colIndex + 1}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}

export default HomePage