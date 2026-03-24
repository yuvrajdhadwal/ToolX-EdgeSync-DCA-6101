import React from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'

const getRoleFromToken = (): string | null => {
  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

const WorldMapPage: React.FC = () => {
  const navigate = useNavigate()
  const role = getRoleFromToken()

  if (role !== 'business_manager') {
    return null
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
          <Profile />
        </div>
        <Logout />
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COLORS.borderPrimary}` }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: COLORS.white, marginBottom: '0.5rem' }}>
          World Map
        </h1>
      </div>

      <main style={{
        flex: 1,
        padding: '1rem',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: '8px',
        boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
      }}>
        <iframe
          title="World Map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-140%2C-60%2C140%2C75&layer=mapnik"
          style={{ width: '100%', height: '100%', minHeight: '600px', border: `1px solid ${COLORS.borderPrimary}`, borderRadius: '8px' }}
          loading="lazy"
        />
      </main>
    </div>
  )
}

export default WorldMapPage