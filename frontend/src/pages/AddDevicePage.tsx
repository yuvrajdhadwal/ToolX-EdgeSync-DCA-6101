import React, { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'
import './styles/AddDevicePage.css'

interface ItemInfo {
  device_type: string;
  serial_number: string;
  description: string;
  location: string;
  developer_manager: string;
}

type devmngOption = {
  username: string;
  id: number;
}

type fieldshopuserOption = {
  id: number;
  username: string;
}

type shopOption = {
  id: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

const AddDevicePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [developerManagers, setDeveloperManagers] = useState<devmngOption[]>([]);
  const [fieldshopuser, setFieldShopUser] = useState<fieldshopuserOption[]>([]);
  const [shops, setShops] = useState<shopOption[]>([]);
  const [selectedFieldShopUsers, setSelectedFieldShopUsers] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch('/devmng')
      .then((res) => res.json())
      .then((data: devmngOption[]) => setDeveloperManagers(data))
      .catch(() => setError('Failed to load developer managers'));

    fetch('/field-shop-professionals', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFieldShopUser(data);
        } else {
          console.error('Unexpected response from /field-shop-professionals:', data);
        }
      })
      .catch(() => console.error('Failed to load field shop professionals'));

    fetch('/shops', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setShops(data);
        } else {
          console.error('Unexpected response from /shops:', data);
        }
      })
      .catch(() => setError('Failed to load shops'));
  }, []);

  const [formData, setFormData] = useState<ItemInfo>({
    device_type: '',
    serial_number: '',
    developer_manager: '',
    location: '',
    description: '',
  });

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (
      !formData.device_type.trim() ||
      !formData.serial_number.trim() ||
      !formData.location.trim() ||
      !formData.developer_manager.trim() ||
      !formData.description.trim() ||
      selectedFieldShopUsers.length === 0
    ) {
      setError('All fields are required. Please fill in every field before submitting.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/add_device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          device_type: formData.device_type,
          serial_number: formData.serial_number,
          description: formData.description,
          developer_manager: formData.developer_manager,
          location: formData.location,
          field_shop_professionals: selectedFieldShopUsers,
        }),
      });
      setLoading(false);

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('Response status:', response.status);
      console.log('Response body:', data);

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate(ROUTES.DEVICES_BIZMNG), 2000);
      } else {
        setError(data.detail?.[0]?.msg || data.detail || 'Failed to add new device.');
      }
    } catch (err) {
      setLoading(false);
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(err);
    }
  }

  return (
    <div className="add-device-page">
      {/* Header */}
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
            style={{ padding: '0 0.85rem', background: COLORS.accentPrimary, border: 'none', borderRight: `1px solid ${COLORS.white}`, height: '100%', display: 'flex', alignItems: 'center' }}
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
          <h2 className="add-device-title">Add New Device</h2>

          <form className="add-device-form" onSubmit={handleSubmit}>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-type">Device Type:</label>
              <input
                id="add-device-type"
                className="add-device-input"
                type='text'
                name='device_type'
                value={formData.device_type}
                onChange={handleInputChange}
              />
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-serial">Serial Number:</label>
              <input
                id="add-device-serial"
                className="add-device-input"
                type='text'
                name='serial_number'
                value={formData.serial_number}
                onChange={handleInputChange}
              />
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-location">Shop:</label>
              <select
                id="add-device-location"
                className="add-device-input"
                name='location'
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              >
                <option value="">Select a Shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.location}>
                    {shop.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-manager">Developer Manager:</label>
              <select
                id="add-device-manager"
                className="add-device-input"
                value={formData.developer_manager}
                onChange={(e) => setFormData({ ...formData, developer_manager: e.target.value })}
              >
                <option value="">Select a Developer Manager</option>
                {developerManagers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Shop Professionals — uses add-device-row for consistency */}
            <div className="add-device-row" style={{ alignItems: 'start' }}>
              <label className="add-device-label" style={{ paddingTop: '0.4rem' }}>
                Field Shop Professionals:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <select
                  className="add-device-input"
                  value=""
                  onChange={(e) => {
                    const username = e.target.value;
                    if (username && !selectedFieldShopUsers.includes(username)) {
                      setSelectedFieldShopUsers(prev => [...prev, username]);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Select a Field Shop Professional</option>
                  {fieldshopuser
                    .filter(p => !selectedFieldShopUsers.includes(p.username))
                    .map(prof => (
                      <option key={prof.id} value={prof.username}>
                        {prof.username}
                      </option>
                    ))}
                </select>

                {selectedFieldShopUsers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selectedFieldShopUsers.map(username => (
                      <span
                        key={username}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.25rem 0.6rem', borderRadius: '999px',
                          backgroundColor: COLORS.backgroundTertiary,
                          border: `1px solid ${COLORS.borderPrimary}`,
                          color: COLORS.textPrimary, fontSize: '0.85rem',
                        }}
                      >
                        {username}
                        <button
                          type="button"
                          onClick={() => setSelectedFieldShopUsers(prev => prev.filter(u => u !== username))}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: COLORS.textMuted, fontSize: '0.85rem', padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-description">Device Description:</label>
              <textarea
                id="add-device-description"
                className="add-device-textarea"
                name='description'
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div className="add-device-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="add-device-submit"
                disabled={loading}
                type='submit'
              >
                {loading ? 'Adding New Device...' : 'Add New Device'}
              </button>
            </div>

            {success && (
              <p className="add-device-success">
                Device added successfully! Redirecting...
              </p>
            )}

            {error && (
              <p className="add-device-error">
                {error}
              </p>
            )}

          </form>
        </section>
      </div>
    </div>
  )
}

export default AddDevicePage