import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'
import './styles/AddDevicePage.css'

type AddShopFormState = {
  location: string
  latitude: string
  longitude: string
}


const AddShopPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from ?? ROUTES.WORLD_MAP;

  const [formData, setFormData] = React.useState<AddShopFormState>({
    location: '',
    latitude: '',
    longitude: '',
  });
  const [error, setError] = React.useState<string>('');
  const [success, setSuccess] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);

  // Fetch all shops for uniqueness check
  const [shops, setShops] = React.useState<any[]>([]);
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/shops', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setShops(data);
      })
      .catch(() => setError('Failed to load shops for validation.'));
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleCreateShop = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validate all fields are filled
    if (!formData.location.trim() || !formData.latitude.trim() || !formData.longitude.trim()) {
      setError('All fields are required. Please fill in every field.');
      setLoading(false);
      return;
    }

    // Validate latitude/longitude are numbers and in valid range
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setError('Latitude and Longitude must be valid numbers.');
      setLoading(false);
      return;
    }
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90.');
      setLoading(false);
      return;
    }
    if (lon < -180 || lon > 180) {
      setError('Longitude must be between -180 and 180.');
      setLoading(false);
      return;
    }
    const latLonExists = shops.some((shop) => {
      const shopLat = typeof shop.latitude === 'string' ? parseFloat(shop.latitude) : shop.latitude;
      const shopLon = typeof shop.longitude === 'string' ? parseFloat(shop.longitude) : shop.longitude;
      return shopLat === lat && shopLon === lon;
    });
    if (latLonExists) {
      setError('A shop with this latitude and longitude already exists.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/add_shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          location: formData.location.trim(),
          latitude: lat,
          longitude: lon,
        }),
      });
      setLoading(false);
      const text = await response.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (response.ok) {
        setSuccess(true);
        setFormData({ location: '', latitude: '', longitude: '' });
        setTimeout(() => navigate(fromPath), 1200);
      } else {
        setError(data.detail || 'Failed to add new shop.');
      }
    } catch (err) {
      setLoading(false);
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('An unknown error occurred.');
      }
    }

    // End of handleCreateShop
  };

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
              background: COLORS.accentPrimary,
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
                background: COLORS.danger,
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
              <label className="add-device-label" htmlFor="add-shop-location">Shop Location:</label>
              <input
                id="add-shop-location"
                className="add-device-input"
                type="text"
                name="location"
                value={formData.location}
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
                value={formData.latitude}
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
                value={formData.longitude}
                onChange={handleChange}
              />
            </div>

            <div className="add-device-footer" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                className="add-device-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating Shop...' : 'Create Shop'}
              </button>
            </div>

            {success && (
              <p className="add-device-success">Shop created successfully!</p>
            )}
            {error && (
              <p className="add-device-error">{error}</p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

export default AddShopPage
