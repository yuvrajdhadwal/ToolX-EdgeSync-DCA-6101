import React, {useState, useEffect } from 'react'
import { data, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'



    


const UploadPage: React.FC = () => {
  const navigate = useNavigate()
  const [column, setColumn] = useState([])
  const [records, setRecords] = useState([])

  useEffect(() => {
    fetch('/device_types')
    .then (response => response.json)
    .then (data => {
      setColumn(Object.keys(data.users[0]))
      setRecords(data.users)
    })
      
  }, [])
    
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
      width: '100%',
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
          <h2 style={{ textAlign: 'left', marginBottom: '2.5rem', fontSize: '1.5rem', color: COLORS.textPrimary, paddingLeft: '5rem' }}>
            Devices
          </h2>

            
        </div>
    </div>
    
    
  )
}

export default UploadPage