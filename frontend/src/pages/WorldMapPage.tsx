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

type Device = {
  device_type: string
  version_number: string
  last_update: string
  location: string
  region?: string
  serial_number: string
  description: string
  latitude: number | null
  longitude: number | null
}

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
  const [devices, setDevices] = React.useState<Device[]>([])
  const [selectedDeviceType, setSelectedDeviceType] = React.useState('all')
  const [selectedRegion, setSelectedRegion] = React.useState('all')
  const [isLoadingDevices, setIsLoadingDevices] = React.useState(true)
  const [loadError, setLoadError] = React.useState('')

  const pinIcon = React.useMemo(
    () =>
      L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:9999px;background:#f85149;border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(0,0,0,0.35);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    [],
  )

  React.useEffect(() => {
    let mounted = true

    const loadOnlineDevices = async () => {
      if (mounted && devices.length === 0) {
        setIsLoadingDevices(true)
      }
      setLoadError('')

      try {
        const res = await fetch('/get_online_devices')
        if (!res.ok) {
          throw new Error('Failed to load active devices')
        }
        const payload = await res.json()
        const data = Array.isArray(payload) ? (payload as Device[]) : []
        if (mounted) {
          setDevices(data)
        }
      } catch {
        if (mounted) {
          setLoadError('Failed to load active device pins.')
        }
      } finally {
        if (mounted) {
          setIsLoadingDevices(false)
        }
      }
    }

    void loadOnlineDevices()
    const timer = window.setInterval(() => {
      void loadOnlineDevices()
    }, 10000)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  const devicesWithCoordinates = React.useMemo(
    () =>
      devices.filter(
        (device) =>
          typeof device.latitude === 'number' &&
          typeof device.longitude === 'number' &&
          !Number.isNaN(device.latitude) &&
          !Number.isNaN(device.longitude),
      ),
    [devices],
  )

  const availableDeviceTypes = React.useMemo(
    () =>
      Array.from(
        new Set(
          devicesWithCoordinates
            .map((device) => device.device_type)
            .filter((deviceType) => Boolean(deviceType?.trim())),
        ),
      ).sort((first, second) => first.localeCompare(second)),
    [devicesWithCoordinates],
  )

  const filteredDevices = React.useMemo(() => {
    return devicesWithCoordinates.filter((device) => {
      const matchesType = selectedDeviceType === 'all' || device.device_type === selectedDeviceType
      const normalizedRegion = (device.region ?? '').toLowerCase()
      const matchesRegion =
        selectedRegion === 'all' || normalizedRegion === selectedRegion.toLowerCase()

      if (!matchesType || !matchesRegion) {
        return false
      }

      return true
    })
  }, [devicesWithCoordinates, selectedDeviceType, selectedRegion])

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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
        {isLoadingDevices ? <p style={{ margin: 0, color: COLORS.textMuted }}>Loading device pins...</p> : null}
        {loadError ? <p style={{ margin: 0, color: COLORS.dangerText }}>{loadError}</p> : null}
        {!isLoadingDevices && !loadError && filteredDevices.length === 0 ? (
          <p style={{ margin: 0, color: COLORS.textMuted }}>No active devices match the selected filters.</p>
        ) : null}
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
            {filteredDevices.map((device) => (
              <Marker
                key={device.serial_number}
                position={[device.latitude as number, device.longitude as number]}
                icon={pinIcon}
                eventHandlers={{
                  click: () => {
                    navigate(ROUTES.DEVICE_DETAIL.replace(':serialNumber', encodeURIComponent(device.serial_number)), {
                      state: {
                        device,
                        fromRoute: ROUTES.WORLD_MAP,
                      },
                    })
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  {device.device_type}
                </Tooltip>
              </Marker>
            ))}
            <ResetMapControl center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} resetSignal={resetSignal} />
          </MapContainer>
        </div>
      </main>
    </div>
  )
}

export default WorldMapPage