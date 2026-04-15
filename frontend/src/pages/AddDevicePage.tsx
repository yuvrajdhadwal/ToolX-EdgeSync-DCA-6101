import React, { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'

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

type fieldshopuserOption = {
  id: number;
  username: string;
}

const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;
const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;

const inputStyle = {
  padding: '0.5rem',
  borderRadius: '6px',
  border: `1px solid ${COLORS.borderPrimary}`,
  backgroundColor: COLORS.backgroundPrimary,
  color: COLORS.textPrimary,
  width: '100%',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  color: COLORS.textPrimary,
  fontSize: '1rem',
  fontWeight: 500,
  textAlign: 'right' as const,
}

const AddDevicePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [developerManagers, setDeveloperManagers] = useState<devmngOption[]>([]);
  const [fieldshopuser, setFieldShopUser] = useState<fieldshopuserOption[]>([]);
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
      !formData.description.trim() ||
      selectedFieldShopUsers.length == 0
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '2rem',
      gap: '2rem',
      backgroundColor: COLORS.backgroundPrimary,
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Header with SLB */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center'}}>
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
          <Profile></Profile>
        </div>

      </header>
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '2rem',
                gap: '2rem',
                backgroundColor: COLORS.backgroundSecondary,
                borderRadius: '10px',
                }}>
          <h2 style={{ textAlign: 'left', marginBottom: '2.5rem', fontSize: '1.5rem', color: COLORS.textPrimary, paddingLeft: '5rem' }}>
            Add New Device
            
          </h2>
            <form style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content 1fr', gap: '1.5rem', alignItems: 'center', paddingLeft: '5rem', paddingRight: '5rem' }}
                onSubmit={handleSubmit}>

                <label style={{ color: COLORS.textPrimary, fontSize: '1rem', fontWeight: 500, textAlign: 'right' }}>
                    Device Type:
                </label>
                <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
                    type='text'
                    name='device_type'
                    value={formData.device_type}
                    onChange={handleInputChange}
                />

                <label style={{ color: COLORS.textPrimary, fontSize: '1rem', fontWeight: 500, textAlign: 'right' }}>
                    Serial Number:
                </label>
                <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
                    type='text'
                    name='serial_number'
                    value={formData.serial_number}
                    onChange={handleInputChange}
                />
                
                <label style={{ color: COLORS.textPrimary, fontSize: '1rem', fontWeight: 500, textAlign: 'right' }}>
                    Location:
                </label>
                <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
                    type='text'
                    name='location'
                    value={formData.location}
                    onChange={handleInputChange}
                />

                <label style={{ color: COLORS.textPrimary, fontSize: '1rem', fontWeight: 500, textAlign: 'right' }}>
                    Latitude / Longitude:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
                      type='number'
                      step='any'
                      min={LATITUDE_MIN}
                      max={LATITUDE_MAX}
                      name='latitude'
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder='Latitude (e.g. 29.7604, -90 to 90)'
                    />
                    <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
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

                <label style={{
                    ...labelStyle,
                    alignSelf: 'start',
                    paddingTop: selectedFieldShopUsers.length > 0
                      ? '0.35rem'   // aligned with top of dropdown when chips present
                      : '0.55rem'   // centered with dropdown when no chips
                  }}>
                    Field Shop Professionals:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <select
                      value=""
                      onChange={(e) => {
                        const username = e.target.value;
                        if (username && !selectedFieldShopUsers.includes(username)) {
                          setSelectedFieldShopUsers(prev => [...prev, username]);
                        }
                        e.target.value = '';
                      }}
                      style={inputStyle}
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

                    {/* Chips inside normal flow — grid row grows naturally, pushing description down */}
                    {selectedFieldShopUsers.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                      }}>
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

                  <label style={{ color: COLORS.textPrimary, fontSize: '1rem', fontWeight: 500, textAlign: 'right' }}>
                    Developer Manager:
                    </label>
                    <select
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

                <label style={{ color: COLORS.textPrimary, fontSize: '1rem', fontWeight: 500, textAlign: 'right', gridColumnStart: 1, alignSelf: 'start' }}>
                    Device Description:
                </label>
                <textarea style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', gridColumn: '2/5', minHeight: '5rem', resize: 'vertical', boxSizing: 'border-box' }}
                    name='description'
                    value={formData.description}
                    onChange={handleInputChange}
                />

                <button style={{
                    backgroundColor: COLORS.success,
                    color: COLORS.white,
                    justifySelf: 'end',
                    gridColumn: '4',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                }}
                    disabled={loading}
                    type='submit'
                >
                    {loading ? 'Adding New Device...' : 'Add New Device'}
                    
                </button>
                {success && (
                    <p style={{
                        color: COLORS.success,
                        fontWeight: 500,
                        textAlign: 'center',
                        gridColumn: '1/5',
                    }}>
                        Device added successfully! Redirecting...
                    </p>
                )}

                {error && (
                    <p style={{
                        color: COLORS.dangerText,
                        fontWeight: 500,
                        textAlign: 'center',
                        gridColumn: '1/5',
                    }}>
                        {error}
                    </p>
                )}
            </form>
          </div>
    </div>
    
    
  )
}

export default AddDevicePage