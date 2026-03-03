import React, {useState} from 'react'
import type { ChangeEvent } from 'react'
import { Meta, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'



interface ItemInfo {
    file: File | null;
    device_type: string;
    version_number: string;
    description: string;
    isEmergency: boolean;
    developer: number;
    approved_by: number | null;
    declined_by: number | null;
    declined_comment: string |null;
}
    


const UploadPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()

  const [formData, setFormData] = useState<ItemInfo>({
    file: null,
    device_type: '',
    developer: 0,
    version_number: '',
    isEmergency: false,
    description: '',

    approved_by: null,
    declined_by: null,
    declined_comment: null,


  });
  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type } = event.target;
    let value: any;
    if (type === 'checkbox') {
      value = (event.target as HTMLInputElement).checked;
    } else {
      value = event.target.value;
    }
    setFormData({
        ...formData,
        [name]: value,
    });
  };

  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const {file, ...metaData} = formData
    try {
      const response = await fetch('/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaData),
      });
      setLoading(false);
      if (response.ok) {
        navigate(ROUTES.HOME);
      } else {
        console.error('Failed to upload data');
      }
      
    } catch (error) {
      console.error('An error occurred during info upload', error);
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
      {/* Header with SLB and Logout */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button 
          type="button" 
          onClick={() => navigate(ROUTES.HOME)}
          style = {{
            padding: '0.5rem 1.5rem',
            backgroundColor: COLORS.backgroundPrimary,
            border: 'none'
          }}
        >
          <img 
          src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
          alt="SLB Logo" 
          style={{ width: '100px', height: 'auto' }} 
          />
            
        </button>

        <button 
          type="button" 
          onClick={() => navigate(ROUTES.LOGIN)}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '6px',
            border: `1px solid ${COLORS.danger}`,
            backgroundColor: 'transparent',
            color: COLORS.dangerText,
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          Logout
        </button>

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
            Create New Update
          </h2>
            <form style={{display: 'grid', gridTemplateColumns: 'max-content 1fr max-content 1fr', gap: '.5rem', alignItems: 'center'}}
                onSubmit={handleSubmit}>
                <label style={{
                    color: COLORS.textPrimary,
                    fontSize:'1rem',
                    fontWeight: 500,
                    paddingLeft: '5rem',
                    textAlign: 'right',
                    
                    }}>
                        Firmware File:
                </label>
                <input style={{
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: COLORS.backgroundPrimary,
                        width: '11rem',
                        textAlign: 'right',
                        
                    }}
                    type='file'
                    name='file'>
                </input>

                <label style={{
                    color: COLORS.textPrimary,
                    fontSize:'1rem',
                    fontWeight: 500,
                    textAlign: 'right'
                    }}>
                        Emergency:
                </label>
                <input style = {{

                    width: '1rem',
                    alignItems:'center'
                    }}
                    type='checkbox'
                    checked = {formData.isEmergency}
                    name='isEmergency'
                    onChange={handleInputChange}>
                </input>
                
                <label style={{
                    color: COLORS.textPrimary,
                    fontSize:'1rem',
                    fontWeight: 500,
                    textAlign: 'right'
                    }}>
                        Device Type:
                </label>
                <input style = {{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.borderPrimary}`,
                    backgroundColor: COLORS.backgroundPrimary,
                    width: '20rem',
                    }}
                    type='text'
                    name='device_type'
                    value={formData.device_type}
                    onChange={handleInputChange}>
                </input>

                <label style={{
                    color: COLORS.textPrimary,
                    fontSize:'1rem',
                    fontWeight: 500,
                    textAlign: 'right'
                    }}>
                        Developer:
                </label>
                <input style = {{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.borderPrimary}`,
                    backgroundColor: COLORS.backgroundPrimary,
                    width: '20rem',
                    }}
                    type='text'
                    name='developer'
                    value={formData.developer}
                    onChange={handleInputChange}>
                </input>

                <label style={{
                    color: COLORS.textPrimary,
                    fontSize:'1rem',
                    fontWeight: 500,
                    textAlign: 'right'
                }}>
                    Version:
                </label>
                <input style = {{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.borderPrimary}`,
                    backgroundColor: COLORS.backgroundPrimary,
                    width: '20rem',
                    }}
                    type='text'
                    name='version_number'
                    value={formData.version_number}
                    onChange={handleInputChange}>
                </input>

                <label style={{
                    color: COLORS.textPrimary,
                    fontSize:'1rem',
                    fontWeight: 500,
                    textAlign: 'right',
                    gridColumnStart:1,
                    alignSelf: 'start',
                }}>
                    Description:
                </label>
                <textarea style = {{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.borderPrimary}`,
                    backgroundColor: COLORS.backgroundPrimary,
                    width: '59rem',
                    gridColumn:'2/5',
                    minHeight: '5rem',
                    resize: 'vertical',
                    }}
                    name='description'
                    value={formData.description}
                    onChange={handleInputChange}>
                </textarea>
                <button style={{
                    backgroundColor: COLORS.success,
                    placeSelf: 'center',
                    gridColumn: '4',
                    maxWidth: '10rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  disabled={loading}
                  type='submit'
                    >
                    {loading? 'Uploading...':'Submit Update'}
                </button>


                
            </form>
          </div>
    </div>
    
    
  )
}

export default UploadPage