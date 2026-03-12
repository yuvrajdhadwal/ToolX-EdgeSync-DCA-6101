import { useEffect, useState} from 'react'
import { useLocation } from 'react-router-dom'

interface Profiledata {
    user: String;
    role: String;
}

export default function Profile() {
    const [profile, setProfile] = useState<Profiledata | null>(null);
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

    if (!profile) {
        return null;
    }

    return (
        <div style={{
                    padding: '0.5rem 1.5rem',
                    fontSize: '1rem',
                    borderRadius: '6px',
                    border: `1px solid`,
                    backgroundColor: 'transparent',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.1rem',
                }}>
            <span>Username: {profile.user}</span>
            <span>Role: {profile.role}</span>
        </div>
    )
}
