import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

const BizMngPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<'worldmap' | 'devices' | 'firmware'>('devices')
  const [clickedButton, setClickedButton] = useState<string | null>(null)

  const handleButtonClick = (value: 'worldmap' | 'devices' | 'firmware') => {
    setActiveView(value)
    setClickedButton(value)
    if (value == 'devices') {
      navigate(ROUTES.DEVICES_BIZMNG)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
    }}>
      {/* Header */}
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

      

      {/* Dashboard Header */}
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
      </div>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '1.5rem',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: '8px',
        boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
      }}>
        {/*Buttons for World Map, Devices, and Firmware*/}
        <div style={{display: 'flex', gap: '7.5rem', justifyContent: 'center'}}>
          {[
            {label: 'World Map', value: 'worldmap' as const},
            {label: 'Devices', value: 'devices' as const},
            {label: 'Firmware', value: 'firmware' as const},
          ].map(({label, value}) => (
            <button
              key={value}
              type="button"
              onClick={() => handleButtonClick(value)}
              style={{
                whiteSpace: 'nowrap',
                padding: '1rem 6.5rem',
                fontSize: '1.15rem',
                cursor: 'pointer',
                borderRadius: '8px',
                border: `2px solid ${COLORS.accentPrimary}`,
                backgroundColor: 'transparent',
                color: COLORS.white,
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

export default BizMngPage