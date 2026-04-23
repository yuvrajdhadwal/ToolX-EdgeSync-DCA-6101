import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'
import './styles/AddDevicePage.css'

type AddShopFormState = {
  shopId: string
  location: string
  latitude: string
  longitude: string
}

const AddShopPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = (location.state as { from?: string } | null)?.from ?? ROUTES.WORLD_MAP

  const [formState, setFormState] = React.useState<AddShopFormState>({
    shopId: '',
    location: '',
    latitude: '',
    longitude: '',
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((previous) => ({ ...previous, [name]: value }))
  }

  const handleCreateShop = (event: React.FormEvent) => {
    event.preventDefault()
  }

  return (
    <div className="add-device-page">
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

      <div className="add-device-content">
        <section className="add-device-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
            <h2 className="add-device-title" style={{ margin: 0 }}>Add Shop</h2>
            <button
              className="add-device-submit"
              type="button"
              onClick={() => navigate(fromPath)}
              style={{
                minWidth: 'auto',
                padding: '0.35rem 1rem',
                fontSize: '0.98rem',
                fontWeight: 500,
                borderRadius: 6,
                marginLeft: '1.5rem',
                background: 'var(--color-brand-700)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>

          <form className="add-device-form" onSubmit={handleCreateShop}>
            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-shop-id">Shop ID:</label>
              <input
                id="add-shop-id"
                className="add-device-input"
                type="text"
                name="shopId"
                value={formState.shopId}
                onChange={handleChange}
              />
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-shop-location">Shop Location:</label>
              <input
                id="add-shop-location"
                className="add-device-input"
                type="text"
                name="location"
                value={formState.location}
                onChange={handleChange}
              />
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-shop-latitude">Latitude:</label>
              <input
                id="add-shop-latitude"
                className="add-device-input"
                type="text"
                name="latitude"
                value={formState.latitude}
                onChange={handleChange}
              />
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-shop-longitude">Longitude:</label>
              <input
                id="add-shop-longitude"
                className="add-device-input"
                type="text"
                name="longitude"
                value={formState.longitude}
                onChange={handleChange}
              />
            </div>

            <div className="add-device-footer" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                className="add-device-submit"
                type="submit"
              >
                Create Shop
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default AddShopPage