import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'

const DEFAULT_CENTER: [number, number] = [20, 0]
const DEFAULT_ZOOM = 2

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

type ResetMapControlProps = {
  center: [number, number]
  zoom: number
  resetSignal: number
}

const ResetMapControl: React.FC<ResetMapControlProps> = ({ center, zoom, resetSignal }) => {
  const map = useMap()

  React.useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, resetSignal, map])

  return null
}

const WorldMapPage: React.FC = () => {
  const navigate = useNavigate()
  const role = getRoleFromToken()
  const [resetSignal, setResetSignal] = React.useState(0)

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
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: '8px',
        boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setResetSignal(prev => prev + 1)}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: '6px',
              border: `1px solid ${COLORS.accentPrimary}`,
              backgroundColor: 'transparent',
              color: COLORS.textPrimary,
              fontWeight: 500,
            }}
          >
            Reset
          </button>
        </div>
        <div style={{ width: '77%', margin: '0 auto', minHeight: '600px', border: `1px solid ${COLORS.borderPrimary}`, borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '600px', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ResetMapControl center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} resetSignal={resetSignal} />
          </MapContainer>
        </div>
      </main>
    </div>
  )
}

export default WorldMapPage