import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

const Logout = () => {
    const navigate = useNavigate()
    const handleLogout = () => {
        localStorage.removeItem('token');
      }
  return (
    <div style={{ height: '100%', display: 'flex' }}>
        <button
        type="button" 
        onClick={() => {
                    navigate(ROUTES.LOGIN, { replace:true }),
                    handleLogout();
                    }}
        style={{
            padding: '0 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            border: 'none',
            borderLeft: `1px solid ${COLORS.white}`,
            backgroundColor: 'transparent',
            color: COLORS.white,
            fontWeight: 500,
            transition: 'all 0.2s',
            height: '100%',
        }}
        >
            Logout
        </button>
    </div>
  )
}

export default Logout