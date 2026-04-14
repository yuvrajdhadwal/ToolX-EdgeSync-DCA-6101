import { useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

const Logout = () => {
    const navigate = useNavigate()
    const handleLogout = () => {
        localStorage.removeItem('token');
      }
  return (
    <div>
        <button
        type="button" 
        onClick={() => {
                    navigate(ROUTES.LOGIN, { replace:true }),
                    handleLogout();
                    }}
        style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: COLORS.white,
            fontWeight: 500,
            transition: 'all 0.2s',
        }}
        >
            Logout
        </button>
    </div>
  )
}

export default Logout