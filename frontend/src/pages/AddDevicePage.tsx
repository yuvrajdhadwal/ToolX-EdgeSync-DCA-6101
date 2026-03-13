import React, {useState} from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'
import Profile from '../components/Profile'



interface ItemInfo {
    device_type: string;
    serial_number: string;
    version_number: string;
    description: string;
    location: string;
    developer_manager: string;
}
    


const AddDevicePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  

  const [formData, setFormData] = useState<ItemInfo>({
    device_type: '',
    serial_number: '',
    developer_manager: '',
    version_number: '',
    location: '',
    description: ''


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
      !formData.version_number.trim() ||
      !formData.location.trim() ||
      !formData.developer_manager.trim() ||
      !formData.description.trim()
    ) {
      setError('All fields are required. Please fill in every field before submitting.');
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
                version_number: formData.version_number,
                description: formData.description,
                developer_manager: formData.developer_manager,
                location: formData.location,
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
                    Firmware Version:
                </label>
                <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
                    type='text'
                    name='version_number'
                    value={formData.version_number}
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
                    Developer Manager:
                </label>
                <input style={{ padding: '0.5rem', borderRadius: '6px', border: `1px solid ${COLORS.borderPrimary}`, backgroundColor: COLORS.backgroundPrimary, color: COLORS.textPrimary, width: '100%', boxSizing: 'border-box' }}
                    type='text'
                    name='developer_manager'
                    value={formData.developer_manager}
                    onChange={handleInputChange}
                />

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