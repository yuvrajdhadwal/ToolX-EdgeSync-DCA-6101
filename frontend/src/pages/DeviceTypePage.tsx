import React, {} from 'react'
import {useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

const UploadPage: React.FC = () => {
  const navigate = useNavigate()
  const tableHeaders = ['Device Type', 'Description', 'Number Deployed', ]
  const minRows = 1


  
    
  return (
    <div style={{ 
      minHeight: '95vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
      boxSizing: 'border-box',

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

      </header>
        <div style={{ 
              minHeight: '100vh', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '2rem',
              gap: '2rem',
              backgroundColor: COLORS.backgroundSecondary,
              borderRadius: '10px',
              }}>
          <h2 style={{ textAlign: 'left', marginBottom: '2.5rem', fontSize: '1.5rem', color: COLORS.textPrimary, paddingLeft: '' }}>
            Devices
          </h2>
          <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {tableHeaders.map((header) => (
                    <th key={header} style={{ border: `1px solid ${COLORS.borderPrimary}`,
                                              padding: '0.75rem 1rem',
                                              textAlign: 'left',
                                              backgroundColor: COLORS.backgroundTertiary,
                                              color: COLORS.textPrimary,
                                              fontWeight: 600,
                                              whiteSpace: 'nowrap',}}>
                            {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
              {}
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
                      {}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            </table>
          </div>

            
        </div>
    </div>
    
    
  )
}

export default UploadPage