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
        <div>
            <span>Username: {profile.user}</span>
            <span>Role: {profile.role}</span>
        </div>
    )
}
