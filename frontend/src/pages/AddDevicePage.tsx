import React, { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'
import './AddDevicePage.css'

interface ItemInfo {
    device_type: string;
    serial_number: string;
    description: string;
    location: string;
    developer_manager: string;
  latitude: string;
  longitude: string;
}

type devmngOption = {
  username: string;
  id: number;
}

const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;
const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;
    
const AddDevicePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [developerManagers, setDeveloperManagers] = useState<devmngOption[]>([]);
  
  useEffect(() => {
    fetch('/devmng')
      .then((res) => res.json())
      .then((data: devmngOption[]) => setDeveloperManagers(data))
      .catch(() => setError('Failed to load developer managers'));
  }, []);
  
  const [formData, setFormData] = useState<ItemInfo>({
    device_type: '',
    serial_number: '',
    developer_manager: '',
    location: '',
    description: '',
    latitude: '',
    longitude: '',
  });

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData({
        ...formData,
        [name]: value,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate all fields are filled in
    if (
      !formData.device_type.trim() ||
      !formData.serial_number.trim() ||
      !formData.location.trim() ||
      !formData.developer_manager.trim() ||
      !formData.description.trim()
    ) {
      setError('All fields are required. Please fill in every field before submitting.');
      setLoading(false);
      return;
    }

    const latitude = formData.latitude.trim() ? Number(formData.latitude) : null;
    const longitude = formData.longitude.trim() ? Number(formData.longitude) : null;

    if (latitude !== null && (Number.isNaN(latitude) || latitude < LATITUDE_MIN || latitude > LATITUDE_MAX)) {
      setError(`Latitude must be between ${LATITUDE_MIN} and ${LATITUDE_MAX}.`);
      setLoading(false);
      return;
    }

    if (longitude !== null && (Number.isNaN(longitude) || longitude < LONGITUDE_MIN || longitude > LONGITUDE_MAX)) {
      setError(`Longitude must be between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}.`);
      setLoading(false);
      return;
    }
    
    try {
        const response = await fetch('/add_device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                device_type: formData.device_type,
                serial_number: formData.serial_number,
                description: formData.description,
                developer_manager: formData.developer_manager,
                location: formData.location,
                latitude,
                longitude,
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
      {/* Header with SLB */}
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
              <label className="add-device-label" htmlFor="add-device-location">Location:</label>
              <input
                id="add-device-location"
                className="add-device-input"
                type='text'
                name='location'
                value={formData.location}
                onChange={handleInputChange}
              />
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-manager">Developer Manager:</label>
              <select
                id="add-device-manager"
                className="add-device-input"
                value={formData.developer_manager}
                onChange={(e) => setFormData({ ...formData, developer_manager: e.target.value })}
              >
                <option value="" disabled>Select a Developer Manager</option>
                {developerManagers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="add-device-row">
              <label className="add-device-label" htmlFor="add-device-latitude">Latitude / Longitude:</label>
              <div className="add-device-coordinates">
                <input
                  id="add-device-latitude"
                  className="add-device-input"
                  type='number'
                  step='any'
                  min={LATITUDE_MIN}
                  max={LATITUDE_MAX}
                  name='latitude'
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder='Latitude (e.g. 29.7604, -90 to 90)'
                />
                <input
                  id="add-device-longitude"
                  className="add-device-input"
                  type='number'
                  step='any'
                  min={LONGITUDE_MIN}
                  max={LONGITUDE_MAX}
                  name='longitude'
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder='Longitude (e.g. -95.3698, -180 to 180)'
                />
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

            <div className="add-device-footer">
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