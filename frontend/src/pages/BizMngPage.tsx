import React from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'
import worldMapImage from '../assets/business_manager/world_map.avif'
import devicesImage from '../assets/business_manager/device.jpg'
import firmwareImage from '../assets/business_manager/firmware.jpg'

const BizMngPage: React.FC = () => {
  const navigate = useNavigate()
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null)

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
          color: COLORS.textPrimary,
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
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'World Map', value: 'worldmap' as const, image: worldMapImage },
            { label: 'Devices', value: 'devices' as const, image: devicesImage },
            { label: 'Firmware', value: 'firmware' as const, image: firmwareImage },
          ].map(({ label, value, image }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleButtonClick(value)}
              onMouseEnter={() => setHoveredCard(value)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                cursor: 'pointer',
                borderRadius: 0,
                border: `1px solid ${COLORS.borderPrimary}`,
                backgroundColor: COLORS.backgroundPrimary,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                width: '420px',
                height: '560px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                transform: hoveredCard === value ? 'translateY(-8px)' : 'translateY(0)',
                boxShadow: hoveredCard === value
                  ? `0 22px 34px ${COLORS.shadowStrong}`
                  : `0 8px 16px ${COLORS.shadowStrong}`,
              }}
            >
              <img
                src={image}
                alt={label}
                style={{
                  width: '100%',
                  height: '75%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
              <div
                style={{
                  height: '20%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: COLORS.accentPrimary,
                  color: COLORS.white,
                  fontWeight: 600,
                  fontSize: '1.5rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </button>
          ))}
        </div>
      </main>
      </div>
    </div>
  )
}

export default BizMngPage