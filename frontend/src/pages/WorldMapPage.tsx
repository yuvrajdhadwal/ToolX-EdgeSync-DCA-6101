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

type FirmwareOption = {
  id: number
  version_number: string
  device_type: string
  isEmergency: boolean
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
  const [isSelectionMode, setIsSelectionMode] = React.useState(false)
  const [selectedSerials, setSelectedSerials] = React.useState<string[]>([])
  const [selectedDeployType, setSelectedDeployType] = React.useState<string | null>(null)
  const [showDeployPopup, setShowDeployPopup] = React.useState(false)
  const [firmwareOptions, setFirmwareOptions] = React.useState<FirmwareOption[]>([])
  const [selectedFirmwareId, setSelectedFirmwareId] = React.useState<number | ''>('')
  const [isLoadingFirmware, setIsLoadingFirmware] = React.useState(false)
  const [isDeploying, setIsDeploying] = React.useState(false)
  const [deployError, setDeployError] = React.useState('')
  const [deploySuccess, setDeploySuccess] = React.useState('')
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

  const selectedPinIcon = React.useMemo(
    () =>
      L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;border-radius:9999px;background:#2ea043;border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(0,0,0,0.35);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
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

  const selectedDevices = React.useMemo(
    () => filteredDevices.filter((device) => selectedSerials.includes(device.serial_number)),
    [filteredDevices, selectedSerials],
  )

  const loadCurrentFirmwareOptions = React.useCallback(async (deviceType: string) => {
    setIsLoadingFirmware(true)
    setDeployError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/firmware/status/current', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        throw new Error('Failed to load current firmware options')
      }
      const payload = await response.json()
      const options = (Array.isArray(payload) ? payload : []) as FirmwareOption[]
      const filteredOptions = options.filter((firmware) => firmware.device_type === deviceType)
      setFirmwareOptions(filteredOptions)
      setSelectedFirmwareId(filteredOptions.length > 0 ? filteredOptions[0].id : '')
    } catch (error) {
      setFirmwareOptions([])
      setSelectedFirmwareId('')
      setDeployError(error instanceof Error ? error.message : 'Failed to load firmware options')
    } finally {
      setIsLoadingFirmware(false)
    }
  }, [])

  const handleMarkerClick = (device: Device) => {
    if (!isSelectionMode) {
      navigate(ROUTES.DEVICE_DETAIL.replace(':serialNumber', encodeURIComponent(device.serial_number)), {
        state: {
          device,
          fromRoute: ROUTES.WORLD_MAP,
        },
      })
      return
    }

    if (selectedSerials.includes(device.serial_number)) {
      const nextSelected = selectedSerials.filter((serial) => serial !== device.serial_number)
      setSelectedSerials(nextSelected)
      if (nextSelected.length === 0) {
        setSelectedDeployType(null)
      }
      return
    }

    if (selectedDeployType && selectedDeployType !== device.device_type) {
      setDeployError('You can only select devices of the same type for mass deploy.')
      return
    }

    setDeployError('')
    setSelectedDeployType(device.device_type)
    setSelectedSerials((previous) => [...previous, device.serial_number])
  }

  const handleDeploySelected = async () => {
    if (!selectedDeployType || selectedSerials.length === 0) return
    setShowDeployPopup(true)
    setDeploySuccess('')
    await loadCurrentFirmwareOptions(selectedDeployType)
  }

  const handleConfirmDeploy = async () => {
    if (!selectedFirmwareId || selectedSerials.length === 0) return
    setIsDeploying(true)
    setDeployError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/deploy-to-many-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serial_numbers: selectedSerials,
          firmware_id: selectedFirmwareId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail ?? 'Failed to deploy firmware to selected devices')
      }

      const data = await response.json()
      setDeploySuccess(data.message ?? 'Deploy submitted successfully.')
      setShowDeployPopup(false)
      setSelectedSerials([])
      setSelectedDeployType(null)
      setIsSelectionMode(false)
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : 'Failed to deploy firmware')
    } finally {
      setIsDeploying(false)
    }
  }

  if (role !== 'business_manager') {
    return null
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', minHeight: '4.5rem', width: '100%', padding: '0 1.5rem 0 0', backgroundColor: COLORS.accentPrimary, color: COLORS.white }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
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
          <Logout />
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3px solid ${COLORS.borderPrimary}` }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: COLORS.textPrimary, marginBottom: '0.5rem' }}>
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

            <button
              type="button"
              onClick={() => {
                setIsSelectionMode((previous) => !previous)
                setDeployError('')
                setDeploySuccess('')
                if (isSelectionMode) {
                  setSelectedSerials([])
                  setSelectedDeployType(null)
                }
              }}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${COLORS.borderPrimary}`,
                backgroundColor: isSelectionMode ? COLORS.backgroundTertiary : COLORS.backgroundPrimary,
                color: COLORS.textPrimary,
                cursor: 'pointer',
              }}
            >
              {isSelectionMode ? 'Selection On' : 'Select Pins'}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleDeploySelected()
              }}
              disabled={!isSelectionMode || selectedSerials.length === 0}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: COLORS.success,
                color: COLORS.white,
                cursor: !isSelectionMode || selectedSerials.length === 0 ? 'not-allowed' : 'pointer',
                opacity: !isSelectionMode || selectedSerials.length === 0 ? 0.6 : 1,
              }}
            >
              Deploy Selected ({selectedSerials.length})
            </button>
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
        {deployError ? <p style={{ margin: 0, color: COLORS.dangerText }}>{deployError}</p> : null}
        {deploySuccess ? <p style={{ margin: 0, color: COLORS.success }}>{deploySuccess}</p> : null}
        {isSelectionMode && selectedDeployType ? (
          <p style={{ margin: 0, color: COLORS.textMuted }}>
            Selection mode active: {selectedSerials.length} selected ({selectedDeployType})
          </p>
        ) : null}
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
                icon={selectedSerials.includes(device.serial_number) ? selectedPinIcon : pinIcon}
                eventHandlers={{
                  click: () => handleMarkerClick(device),
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

      {showDeployPopup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '540px',
            backgroundColor: COLORS.backgroundSecondary,
            border: `1px solid ${COLORS.borderPrimary}`,
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
          }}>
            <h3 style={{ margin: 0, color: COLORS.textPrimary }}>Deploy from Map</h3>
            <p style={{ margin: 0, color: COLORS.textMuted }}>
              Deploy to {selectedDevices.length} selected device(s) of type {selectedDeployType ?? '-'}. 
            </p>

            {isLoadingFirmware ? (
              <p style={{ margin: 0, color: COLORS.textMuted }}>Loading firmware options...</p>
            ) : (
              <select
                value={selectedFirmwareId}
                onChange={(event) => setSelectedFirmwareId(Number(event.target.value))}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderPrimary}`,
                  backgroundColor: COLORS.backgroundPrimary,
                  color: COLORS.textPrimary,
                }}
              >
                {firmwareOptions.length === 0 ? (
                  <option value="">No current firmware options</option>
                ) : (
                  firmwareOptions.map((firmware) => (
                    <option key={firmware.id} value={firmware.id}>
                      v{firmware.version_number}{firmware.isEmergency ? ' (Emergency)' : ''}
                    </option>
                  ))
                )}
              </select>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowDeployPopup(false)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  border: `1px solid ${COLORS.borderPrimary}`,
                  backgroundColor: 'transparent',
                  color: COLORS.textPrimary,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmDeploy()
                }}
                disabled={isDeploying || !selectedFirmwareId || firmwareOptions.length === 0}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: COLORS.success,
                  color: COLORS.white,
                  cursor: isDeploying || !selectedFirmwareId || firmwareOptions.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isDeploying || !selectedFirmwareId || firmwareOptions.length === 0 ? 0.6 : 1,
                  fontWeight: 600,
                }}
              >
                {isDeploying ? 'Deploying...' : 'Confirm Deploy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorldMapPage