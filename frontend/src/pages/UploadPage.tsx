import React, { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { getHomeRouteFromToken, ROUTES } from '../constants/routes'
import Profile from '../components/Profile'
import Logout from '../components/Logout'
import './styles/UploadPage.css'



interface ItemInfo {
    file: File | null;
    device_type: string;
    version_number: string;
    description: string;
    isEmergency: boolean;
    approved_by: number | null;
    declined_by: number | null;
    declined_comment: string |null;
}
    


const UploadPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canUpload, setCanUpload] = useState(false);
  const navigate = useNavigate();
  const [rejectedFirmwares, setRejectedFirmwares] = useState<{id: number, version_number: string, device_type: string}[]>([]);
  const [previousFirmwareId, setPreviousFirmwareId] = useState<number | null>(null);
  

  const [formData, setFormData] = useState<ItemInfo>({
    file: null,
    device_type: '',
    version_number: '',
    isEmergency: false,
    description: '',
    approved_by: null,
    declined_by: null,
    declined_comment: null,


  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(ROUTES.LOGIN);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string };
      if (payload.role !== 'developer') {
        setError('Only developers can upload firmware.');
        setCanUpload(false);
      } else {
        setCanUpload(true);
      }
    } catch {
      setError('Unable to validate user role.');
      setCanUpload(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/firmware/status/rejected', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch rejected firmwares');
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setRejectedFirmwares(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type } = event.target;
    let value: any;
    if (type === 'file') {
      const fileInput = event.target as HTMLInputElement;
      value = fileInput.files ? fileInput.files[0] : null;
    } else if (type === 'checkbox') {
      value = (event.target as HTMLInputElement).checked;
    } else {
      value = event.target.value;
    }
    if (name === 'device_type') {
      setPreviousFirmwareId(null);
    }
    setFormData({
        ...formData,
        [name]: value,
    });
  };



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canUpload) {
      return;
    }

    if (!formData.file) {
      setLoading(false);
      console.error('Firmware file is required');
      return;
    }

    setLoading(true);
    const data = new FormData();

    if (formData.file) {
    data.append('file', formData.file); 
    }

    if (previousFirmwareId !== null) {
      data.append('previous_firmware_id', String(previousFirmwareId));
    }

    data.append('device_type', formData.device_type);
    data.append('version_number', formData.version_number);
    data.append('description', formData.description);
    data.append('isEmergency', String(formData.isEmergency));
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: data,
      });
      setLoading(false);
      if (response.ok) {
        navigate(getHomeRouteFromToken());
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Failed to upload data');
      }
      
    } catch (error) {
      setLoading(false);
      console.error('An error occurred during info upload', error);
      setError('An error occurred during upload');
    }
  }
  
  return (
    <div className="upload-page">
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
            onClick={() => navigate(getHomeRouteFromToken())}

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
      <div className="upload-content">
        <section className="upload-card">
          <h2 className="upload-title">Create New Update</h2>

          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="upload-row">
              <label className="upload-label" htmlFor="upload-file">Firmware File:</label>
              <input
                id="upload-file"
                className="upload-input"
                type='file'
                name='file'
                onChange={handleInputChange}
              />
            </div>

            <div className="upload-row">
              <label className="upload-label" htmlFor="upload-device-type">Device Type:</label>
              <input
                id="upload-device-type"
                className="upload-input"
                type='text'
                name='device_type'
                value={formData.device_type}
                onChange={handleInputChange}
              />
            </div>

            <div className="upload-row">
              <label className="upload-label" htmlFor="upload-version">Version:</label>
              <input
                id="upload-version"
                className="upload-input"
                type='text'
                name='version_number'
                value={formData.version_number}
                onChange={handleInputChange}
              />
            </div>

            <div className="upload-row upload-row--checkbox" style={{ alignItems: 'center' , display: 'flex', gap: '0.65rem' }}>
              <label className="upload-label" htmlFor="upload-emergency">Emergency:</label>
              <input
                id="upload-emergency"
                className="upload-checkbox"
                type='checkbox'
                checked={formData.isEmergency}
                name='isEmergency'
                onChange={handleInputChange}
              />
            </div>

            <div className="upload-row">
              <label className="upload-label" htmlFor="upload-description">Description:</label>
              <textarea
                id="upload-description"
                className="upload-textarea"
                name='description'
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div className="upload-row">
              <label className="upload-label" htmlFor="upload-replaces">Replaces (optional):</label>
              <select
                id="upload-replaces"
                className="upload-input"
                value={previousFirmwareId ?? ''}
                onChange={e => setPreviousFirmwareId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— New upload (no prior rejection) —</option>
                {rejectedFirmwares
                  .filter(f => f.device_type === formData.device_type)
                  .map(f => (
                  <option key={f.id} value={f.id}>
                    v{f.version_number} ({f.device_type}) [ID #{f.id}]
                  </option>
                ))}
              </select>
            </div>

            <div className="upload-footer">
              <button
                className="upload-submit"
                disabled={loading || !canUpload}
                type='submit'
              >
                {loading ? 'Uploading...' : 'Submit Update'}
              </button>
            </div>

            {error && <p className="upload-error">{error}</p>}
          </form>
        </section>
      </div>
    </div>
  )
}

export default UploadPage
