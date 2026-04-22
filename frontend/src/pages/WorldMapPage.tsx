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

type DeployFirmwareOption = {
  id: number
  version_number: string
  device_type: string
  description: string | null
  isEmergency: boolean
  status: 'current' | 'pending' | 'rejected' | 'deployed'
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
  const [selectedDeviceType] = React.useState('all')
  const [selectedRegion, setSelectedRegion] = React.useState('all')
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState('')

  // Device panel state
  const [selectedShop, setSelectedShop] = React.useState<ShopActivity | null>(null)
  const [shopDevices, setShopDevices] = React.useState<any[]>([])
  const [devicePanelLoading, setDevicePanelLoading] = React.useState(false)
  const [devicePanelError, setDevicePanelError] = React.useState('')
  const [devicePanelType, setDevicePanelType] = React.useState('all')
  const [devicePanelActivity, setDevicePanelActivity] = React.useState('all')
  const [isDeployModeOn, setIsDeployModeOn] = React.useState(false)
  const [selectedDeviceSerials, setSelectedDeviceSerials] = React.useState<Set<string>>(new Set())
  const [showFirmwarePicker, setShowFirmwarePicker] = React.useState(false)
  const [deployFirmwareOptions, setDeployFirmwareOptions] = React.useState<DeployFirmwareOption[]>([])
  const [selectedFirmwareId, setSelectedFirmwareId] = React.useState('')
  const [isLoadingFirmwareOptions, setIsLoadingFirmwareOptions] = React.useState(false)
  const [firmwareOptionError, setFirmwareOptionError] = React.useState('')

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

  // Fetch devices for selected shop
  React.useEffect(() => {
    if (!selectedShop) return
    setDevicePanelLoading(true)
    setDevicePanelError('')
    setShopDevices([])
    setSelectedDeviceSerials(new Set())
    Promise.all([
      fetch('/get_devices').then((res) => {
        if (!res.ok) throw new Error('Failed to load devices')
        return res.json()
      }),
      fetch('/get_online_devices').then((res) => {
        if (!res.ok) throw new Error('Failed to load online devices')
        return res.json()
      }),
    ])
      .then(([allDevices, onlineDevices]) => {
        const activeSerials = new Set(
          Array.isArray(onlineDevices)
            ? onlineDevices.map((d: any) => d.serial_number).filter(Boolean)
            : [],
        )

        const filtered = allDevices
          .filter((d: any) => d.shop_id === selectedShop.id)
          .map((d: any) => ({
            ...d,
            is_active:
              typeof d.is_active === 'boolean' ? d.is_active : activeSerials.has(d.serial_number),
          }))

        setShopDevices(filtered)
      })
      .catch(() => setDevicePanelError('Failed to load devices for this shop.'))
      .finally(() => setDevicePanelLoading(false))
  }, [selectedShop])

  React.useEffect(() => {
    setIsDeployModeOn(false)
    setSelectedDeviceSerials(new Set())
    setShowFirmwarePicker(false)
    setDeployFirmwareOptions([])
    setSelectedFirmwareId('')
    setFirmwareOptionError('')
  }, [selectedShop?.id])

  React.useEffect(() => {
    if (!isDeployModeOn) {
      setShowFirmwarePicker(false)
      setDeployFirmwareOptions([])
      setSelectedFirmwareId('')
      setFirmwareOptionError('')
    }
  }, [isDeployModeOn])

  const handleToggleDeployMode = React.useCallback(() => {
    setIsDeployModeOn((previous) => {
      const next = !previous
      if (!next) {
        setSelectedDeviceSerials(new Set())
      }
      return next
    })
  }, [])

  const toggleDeviceSelection = React.useCallback((serialNumber: string) => {
    setSelectedDeviceSerials((previous) => {
      const next = new Set(previous)
      if (next.has(serialNumber)) {
        next.delete(serialNumber)
      } else {
        next.add(serialNumber)
      }
      return next
    })
  }, [])

  const handleDeploySelected = React.useCallback(() => {
    const selectedSerials = Array.from(selectedDeviceSerials)
    if (!selectedSerials.length) return

    if (!showFirmwarePicker) {
      setShowFirmwarePicker(true)
      return
    }

    if (!selectedFirmwareId) {
      setFirmwareOptionError('Please choose a firmware version.')
      return
    }

    const selectedFirmware = deployFirmwareOptions.find((firmware) => String(firmware.id) === selectedFirmwareId)
    window.alert(
      `Deploy ${selectedFirmware?.version_number ?? 'selected firmware'} to ${selectedSerials.length} device(s).`,
    )
  }, [deployFirmwareOptions, selectedDeviceSerials, selectedFirmwareId, showFirmwarePicker])

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

  // Device panel filtering
  const devicePanelTypes = React.useMemo(() => {
    return Array.from(new Set(shopDevices.map((d) => d.device_type).filter(Boolean))).sort()
  }, [shopDevices])
  const filteredShopDevices = React.useMemo(() => {
    return shopDevices.filter((d) => {
      const matchesType = devicePanelType === 'all' || d.device_type === devicePanelType
      const isActive = typeof d.is_active === 'boolean' ? d.is_active : (d.last_online !== null && d.last_online !== undefined)
      const matchesActivity =
        devicePanelActivity === 'all' ||
        (devicePanelActivity === 'active' && isActive) ||
        (devicePanelActivity === 'inactive' && !isActive)
      return matchesType && matchesActivity
    })
  }, [shopDevices, devicePanelType, devicePanelActivity])

  const selectedDeployDeviceType = React.useMemo(() => {
    const selectedSerial = Array.from(selectedDeviceSerials)[0]
    if (!selectedSerial) return null

    const selectedDevice = filteredShopDevices.find((device) => device.serial_number === selectedSerial)
    return selectedDevice?.device_type ?? null
  }, [filteredShopDevices, selectedDeviceSerials])

  React.useEffect(() => {
    if (!showFirmwarePicker || !isDeployModeOn) return
    if (!selectedDeployDeviceType) {
      setFirmwareOptionError('Select at least one online device first.')
      return
    }

    let mounted = true
    setIsLoadingFirmwareOptions(true)
    setFirmwareOptionError('')

    const loadFirmwareOptions = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/firmware/status/current', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!response.ok) throw new Error('Failed to load firmware options')
        const payload = await response.json()
        const currentFirmware = Array.isArray(payload) ? (payload as DeployFirmwareOption[]) : []
        const filtered = currentFirmware.filter((firmware) => firmware.device_type === selectedDeployDeviceType)
        if (mounted) {
          setDeployFirmwareOptions(filtered)
          setSelectedFirmwareId(filtered[0]?.id ? String(filtered[0].id) : '')
        }
      } catch {
        if (mounted) {
          setFirmwareOptionError('Failed to load firmware versions.')
          setDeployFirmwareOptions([])
        }
      } finally {
        if (mounted) {
          setIsLoadingFirmwareOptions(false)
        }
      }
    }

    void loadFirmwareOptions()

    return () => {
      mounted = false
    }
  }, [showFirmwarePicker, isDeployModeOn, selectedDeployDeviceType])

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
            flexDirection: 'row',
            gap: '1rem',
            backgroundColor: COLORS.backgroundSecondary,
            borderRadius: '8px',
            boxShadow: `0 2px 8px ${COLORS.shadowStrong}`,
            position: 'relative',
          }}
        >
          {/* Device panel */}
          {selectedShop && (
            <div
              style={{
                width: 350,
                minWidth: 300,
                maxWidth: 400,
                background: COLORS.backgroundPrimary,
                borderRight: `2px solid ${COLORS.borderPrimary}`,
                padding: '1rem',
                boxShadow: '2px 0 8px rgba(0,0,0,0.07)',
                zIndex: 10,
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <strong>{selectedShop.location}</strong>
                  <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                    {selectedShop.region} | {selectedShop.active_device_count} active / {selectedShop.total_device_count} total
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: COLORS.dangerText }}
                  title="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <label style={{ display: 'flex', flexDirection: 'column', flex: 1, fontWeight: 500, fontSize: 13 }}>
                  Types
                  <select value={devicePanelType} onChange={e => setDevicePanelType(e.target.value)} style={{ width: '100%' }}>
                    <option value="all">All types</option>
                    {devicePanelTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', flex: 1, fontWeight: 500, fontSize: 13 }}>
                  Status
                  <select value={devicePanelActivity} onChange={e => setDevicePanelActivity(e.target.value)} style={{ width: '100%' }}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={handleToggleDeployMode}
                  style={{
                    padding: '0.45rem 0.7rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.borderPrimary}`,
                    backgroundColor: COLORS.backgroundSecondary,
                    color: COLORS.textPrimary,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Deploy {isDeployModeOn ? 'On' : 'Off'}
                </button>
                {isDeployModeOn ? (
                  <button
                    type="button"
                    onClick={handleDeploySelected}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: '6px',
                      border: `1px solid ${COLORS.accentPrimary}`,
                      backgroundColor: COLORS.accentPrimary,
                      color: COLORS.white,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {showFirmwarePicker ? 'Confirm Deploy' : 'Deploy'}
                  </button>
                ) : null}
              </div>
              {isDeployModeOn && showFirmwarePicker ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 500, fontSize: 13 }}>
                    Firmware version
                    <select
                      value={selectedFirmwareId}
                      onChange={(event) => setSelectedFirmwareId(event.target.value)}
                      disabled={isLoadingFirmwareOptions || deployFirmwareOptions.length === 0}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select firmware</option>
                      {deployFirmwareOptions.map((firmware) => (
                        <option key={firmware.id} value={firmware.id}>
                          {firmware.version_number}{firmware.isEmergency ? ' (Emergency)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isLoadingFirmwareOptions ? <div>Loading firmware versions...</div> : null}
                  {firmwareOptionError ? <div style={{ color: COLORS.dangerText }}>{firmwareOptionError}</div> : null}
                  {!isLoadingFirmwareOptions && !firmwareOptionError && deployFirmwareOptions.length === 0 ? (
                    <div>No approved firmware found for this device type.</div>
                  ) : null}
                </div>
              ) : null}
              {devicePanelLoading ? <div>Loading devices...</div> : null}
              {devicePanelError ? <div style={{ color: COLORS.dangerText }}>{devicePanelError}</div> : null}
              {!devicePanelLoading && !devicePanelError && filteredShopDevices.length === 0 ? <div>No devices found.</div> : null}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: COLORS.backgroundSecondary }}>
                      {isDeployModeOn ? <th style={{ textAlign: 'left', padding: 4 }}>Select</th> : null}
                      <th style={{ textAlign: 'left', padding: 4 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Serial</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShopDevices.map((d, idx) => (
                      <tr key={d.serial_number || idx} style={{ borderBottom: '1px solid #eee' }}>
                        {isDeployModeOn ? (
                          <td style={{ padding: 4 }}>
                            <input
                              type="checkbox"
                              checked={selectedDeviceSerials.has(d.serial_number)}
                              disabled={
                                !(typeof d.is_active === 'boolean' ? d.is_active : Boolean(d.last_online)) ||
                                (selectedDeviceSerials.size > 0 &&
                                  !selectedDeviceSerials.has(d.serial_number) &&
                                  selectedDeployDeviceType !== null &&
                                  d.device_type !== selectedDeployDeviceType)
                              }
                              onChange={() => toggleDeviceSelection(d.serial_number)}
                            />
                          </td>
                        ) : null}
                        <td style={{ padding: 4 }}>{d.device_type}</td>
                        <td style={{ padding: 4 }}>{d.serial_number}</td>
                        <td style={{ padding: 4 }}>
                          {(typeof d.is_active === 'boolean' ? d.is_active : Boolean(d.last_online)) ? <span style={{ color: COLORS.successText }}>Active</span> : <span style={{ color: COLORS.textMuted }}>Inactive</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Map and controls */}
          <div style={{ flex: 1, marginLeft: selectedShop ? 350 : 0, transition: 'margin-left 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'nowrap' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'nowrap' }}>
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
                width: '100%',
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
                    eventHandlers={{
                      click: () => setSelectedShop(shop),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]}>
                      {shop.location} — {shop.active_device_count} active / {shop.total_device_count} total
                    </Tooltip>
                  </Marker>
                ))}
                <ResetMapControl center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} resetSignal={resetSignal} />
              </MapContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default WorldMapPage
