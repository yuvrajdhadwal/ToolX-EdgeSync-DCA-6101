import React from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'

const BizMngPage: React.FC = () => {
  const navigate = useNavigate()

  const handleButtonClick = (value: 'worldmap' | 'devices' | 'firmware') => {
    if (value === 'worldmap') navigate(ROUTES.WORLD_MAP)
    if (value === 'devices') navigate(ROUTES.DEVICES_BIZMNG)
    if (value === 'firmware') navigate(ROUTES.HOME)
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', minHeight: '4.5rem', width: '100%', padding: '0 1.5rem 0 0', backgroundColor: COLORS.accentPrimary, color: COLORS.white }}>
        <div style={{ display: 'flex', alignItems: 'stretch'}}>
          <button 
            type="button" 
            onClick={() => navigate(ROUTES.BIZMNGPAGE)}
            style={{ padding: '0 0.85rem', backgroundColor: COLORS.accentPrimary, border: 'none', borderRight: `1px solid ${COLORS.white}`, height: '100%', display: 'flex', alignItems: 'center' }}
          >
            <img 
              src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
              alt="SLB Logo" 
              style={{ width: '100px', height: 'auto' }} 
            />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', padding: 0 }}>
          <Profile />
          <Logout/>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>

      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COLORS.borderPrimary}` }}>
        <h1 style={{
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
        {/* Buttons for World Map, Devices, and Firmware */}
        <div style={{ display: 'flex', gap: '7.5rem', justifyContent: 'center' }}>
          {[
            { label: 'World Map', value: 'worldmap' as const },
            { label: 'Devices', value: 'devices' as const },
            { label: 'Firmware', value: 'firmware' as const },
          ].map(({ label, value }) => (
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
    </div>
  )
}

export default BizMngPage