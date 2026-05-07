import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import './styles/AuthPages.css'
import './styles/WelcomePage.css'

const WelcomePage: React.FC = () => {
  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <div className="welcome-brand auth-brand--ribbon">
          <img
            className="auth-brand__logo"
            src="https://careers.slb.com/-/media/images/logo/rgb_slb_100_logo_tm_reduced_white.svg"
            alt="SLB Logo"
          />
        </div>
        <h1 className="welcome-title">ToolX Edgesync</h1>
        <p className="welcome-text">Login or Contact an Admin for an Account.</p>

        <div className="welcome-actions"
        style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '1.25rem',
            fontWeight: '600'

        }}
        >
          <Link className="welcome-link" to={ROUTES.LOGIN}>Login</Link>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage