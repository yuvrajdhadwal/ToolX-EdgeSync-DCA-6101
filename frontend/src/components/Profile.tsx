import { useEffect, useState} from 'react'
import { useLocation } from 'react-router-dom'
import { COLORS } from '../constants/colors'

interface Profiledata {
    user: string;
    role: string;
}

export default function Profile() {
    const [profile, setProfile] = useState<Profiledata | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        fetch(`/verify-token/${token}`)
            .then((res) => res.json())
            .then((data) => setProfile({ user: data.user, role: data.role}))
            .catch(() => setProfile(null));
    }, [location]);

    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    if (!profile) {
        return null;
    }

    return (
        <div style={{ position: 'relative', height: '100%', display: 'flex' }}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                style={{
                    padding: '0 1.25rem',
                    fontSize: '1rem',
                    border: 'none',
                    borderLeft: `1px solid ${COLORS.white}`,
                    backgroundColor: 'transparent',
                    color: COLORS.white,
                    fontWeight: 500,
                    cursor: 'pointer',
                    height: '100%',
                }}
            >
                Profile
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        right: 0,
                        padding: '0.65rem 0.85rem',
                        border: `1px solid ${COLORS.borderPrimary}`,
                        backgroundColor: COLORS.white,
                        color: COLORS.accentPrimary,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        minWidth: '220px',
                        zIndex: 20,
                    }}
                >
                    <span>Username: {profile.user}</span>
                    <span>Role: {profile.role}</span>
                </div>
            )}
        </div>
    )
}
