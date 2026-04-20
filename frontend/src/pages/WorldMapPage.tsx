import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'

const DEFAULT_CENTER: [number, number] = [20, 0]
const DEFAULT_ZOOM = 2
const CONTINENTS = [
  'Africa',
  'Antarctica',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
]

type ShopActivity = {
  id: number
  location: string
  latitude: number | null
  longitude: number | null
  region?: string
  device_types: string[]
  active_device_count: number
  total_device_count: number
  pin_color: 'black' | 'blue' | 'green'
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

const createPinIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:15px;height:15px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(0,0,0,0.35);"></div>`,
    iconSize: [15, 15],
    iconAnchor: [8, 8],
  })

const getRoleFromToken = (): string | null => {
  const token = localStorage.getItem('token')
  if (!token) {
    return null
  }

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
  const [resetSignal, setResetSignal] = React.useState(0)
  const [shops, setShops] = React.useState<ShopActivity[]>([])
  const [selectedDeviceType, setSelectedDeviceType] = React.useState('all')
  const [selectedRegion, setSelectedRegion] = React.useState('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState('')

  const blackPinIcon = React.useMemo(() => createPinIcon('#111111'), [])
  const bluePinIcon = React.useMemo(() => createPinIcon('#2f81f7'), [])
  const greenPinIcon = React.useMemo(() => createPinIcon('#2ea043'), [])

  React.useEffect(() => {
    let mounted = true

    const loadShopActivity = async () => {
      if (mounted) {
        setIsLoading(true)
      }
      setLoadError('')

      try {
        const response = await fetch('/shop-activity-map')
        if (!response.ok) {
          throw new Error('Failed to load shop activity')
        }

        const payload = await response.json()
        const data = Array.isArray(payload) ? (payload as ShopActivity[]) : []
        if (mounted) {
          setShops(data)
        }
      } catch {
        if (mounted) {
          setLoadError('Failed to load shop pins.')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadShopActivity()

    const timer = window.setInterval(() => {
      void loadShopActivity()
    }, 10000)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  const shopsWithCoordinates = React.useMemo(
    () =>
      shops.filter(
        (shop) =>
          typeof shop.latitude === 'number' &&
          typeof shop.longitude === 'number' &&
          !Number.isNaN(shop.latitude) &&
          !Number.isNaN(shop.longitude),
      ),
    [shops],
  )

  const availableDeviceTypes = React.useMemo(
    () =>
      Array.from(
        new Set(
          shopsWithCoordinates.flatMap((shop) =>
            Array.isArray(shop.device_types)
              ? shop.device_types.filter((deviceType) => Boolean(deviceType?.trim()))
              : [],
          ),
        ),
      ).sort((first, second) => first.localeCompare(second)),
    [shopsWithCoordinates],
  )

  const filteredShops = React.useMemo(() => {
    return shopsWithCoordinates.filter((shop) => {
      const matchesType =
        selectedDeviceType === 'all' ||
        (Array.isArray(shop.device_types) && shop.device_types.includes(selectedDeviceType))

      const normalizedRegion = (shop.region ?? '').toLowerCase()
      const matchesRegion =
        selectedRegion === 'all' || normalizedRegion === selectedRegion.toLowerCase()

      return matchesType && matchesRegion
    })
  }, [shopsWithCoordinates, selectedDeviceType, selectedRegion])

  if (role !== 'business_manager') {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        gap: 0,
        backgroundColor: COLORS.backgroundPrimary,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          minHeight: '4.5rem',
          width: '100%',
          padding: 0,
          backgroundColor: COLORS.accentPrimary,
          color: COLORS.white,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button
            type="button"
            onClick={() => navigate(ROUTES.BIZMNGPAGE)}
            style={{
              padding: '0 0.85rem',
              backgroundColor: COLORS.accentPrimary,
              border: 'none',
              borderRight: `1px solid ${COLORS.white}`,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
              alt="SLB Logo"
              style={{ width: '100px', height: 'auto' }}
            />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', padding: 0, marginLeft: 'auto' }}>
          <Profile />
          <Logout />
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderBottom: `3px solid ${COLORS.borderPrimary}`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 700,
              color: COLORS.textPrimary,
              marginBottom: '0.5rem',
            }}
          >
            World Map
          </h1>
        </div>

        <main
          style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: COLORS.backgroundSecondary,
            borderRadius: '8px',
            boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap' }}>
              <select
                value={selectedDeviceType}
                onChange={(event) => setSelectedDeviceType(event.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderPrimary}`,
                  backgroundColor: COLORS.backgroundPrimary,
                  color: COLORS.textPrimary,
                  minWidth: '200px',
                }}
              >
                <option value="all">All device types</option>
                {availableDeviceTypes.map((deviceType) => (
                  <option key={deviceType} value={deviceType}>
                    {deviceType}
                  </option>
                ))}
              </select>

              <select
                value={selectedRegion}
                onChange={(event) => setSelectedRegion(event.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderPrimary}`,
                  backgroundColor: COLORS.backgroundPrimary,
                  color: COLORS.textPrimary,
                  minWidth: '220px',
                }}
              >
                <option value="all">All regions</option>
                {CONTINENTS.map((continent) => (
                  <option key={continent} value={continent}>
                    {continent}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: COLORS.textPrimary }}>
              <span>Legend:</span>
              <span>● Black (0-5 active)</span>
              <span>● Blue (6-25 active)</span>
              <span>● Green ({'>'}25 active)</span>
            </div>
            <button
              type="button"
              onClick={() => setResetSignal((previous) => previous + 1)}
              style={{
                padding: '0.5rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                borderRadius: '6px',
                border: `1px solid ${COLORS.accentPrimary}`,
                backgroundColor: 'transparent',
                color: COLORS.white,
                fontWeight: 500,
              }}
            >
              Reset
            </button>
          </div>

          {isLoading ? <p style={{ margin: 0, color: COLORS.textMuted }}>Loading shop pins...</p> : null}
          {loadError ? <p style={{ margin: 0, color: COLORS.dangerText }}>{loadError}</p> : null}
          {!isLoading && !loadError && filteredShops.length === 0 ? (
            <p style={{ margin: 0, color: COLORS.textMuted }}>No shops with coordinates available.</p>
          ) : null}

          <div
            style={{
              width: '77%',
              margin: '0 auto',
              minHeight: '600px',
              border: `1px solid ${COLORS.borderPrimary}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '600px', width: '100%' }} zoomControl>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredShops.map((shop) => (
                <Marker
                  key={shop.id}
                  position={[shop.latitude as number, shop.longitude as number]}
                  icon={
                    shop.pin_color === 'green'
                      ? greenPinIcon
                      : shop.pin_color === 'blue'
                        ? bluePinIcon
                        : blackPinIcon
                  }
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    {shop.location} — {shop.active_device_count} active / {shop.total_device_count} total
                  </Tooltip>
                </Marker>
              ))}
              <ResetMapControl center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} resetSignal={resetSignal} />
            </MapContainer>
          </div>
        </main>
      </div>
    </div>
  )
}

export default WorldMapPage