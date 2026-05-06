import { useEffect, useState} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { COLORS } from '../constants/colors'
import { ROUTES } from '../constants/routes'

interface Profiledata {
    user: string;
    role: string;
}

export default function Profile() {
    const [profile, setProfile] = useState<Profiledata | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const location = useLocation();
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const resetPasswordForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordSuccess('');
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }
        if (newPassword === currentPassword) {
            setPasswordError('New password must be different from current password.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { detail?: string };
                setPasswordError(data.detail ?? 'Failed to change password.');
                return;
            }

            setPasswordSuccess('Password changed. Please log in again.');
            setTimeout(() => {
                localStorage.removeItem('token');
                navigate(ROUTES.LOGIN, { replace: true });
            }, 1500);
        } catch {
            setPasswordError('An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

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
        <>
            <div style={{ position: 'relative', height: '100%', display: 'flex' }}>
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen((prev) => !prev);
                        resetPasswordForm();
                        setShowChangePassword(false);
                    }}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    style={{
                        padding: '0 1.25rem',
                        fontSize: '1rem',
                        border: 'none',
                        borderLeft: `1px solid ${COLORS.white}`,
                        background: isHovering ? COLORS.accentHover : COLORS.accentPrimary,
                        color: COLORS.white,
                        fontWeight: 500,
                        cursor: 'pointer',
                        height: '100%',
                        transition: 'background-color 0.2s',
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
                            gap: '0.5rem',
                            minWidth: '220px',
                            zIndex: 20,
                        }}
                    >
                        <span>Username: {profile.user}</span>
                        <span>Role: {profile.role}</span>
                        <button
                            type="button"
                            onClick={() => {
                                setShowChangePassword(true);
                                setIsOpen(false);
                                resetPasswordForm();
                            }}
                            style={{
                                marginTop: '0.25rem',
                                padding: '0.4rem 0.75rem',
                                fontSize: '0.875rem',
                                border: `1px solid ${COLORS.accentPrimary}`,
                                borderRadius: '4px',
                                background: 'transparent',
                                color: COLORS.accentPrimary,
                                cursor: 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            Change Password
                        </button>
                    </div>
                )}
            </div>

            {/* Change Password Modal */}
            {showChangePassword && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 1000,
                }}>
                    <div style={{
                        width: '100%', maxWidth: '420px',
                        backgroundColor: COLORS.backgroundSecondary,
                        border: `1px solid ${COLORS.borderPrimary}`,
                        borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderBottom: `1px solid ${COLORS.borderPrimary}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <h3 style={{ margin: 0, color: COLORS.textPrimary }}>Change Password</h3>
                            <button
                                type="button"
                                onClick={() => { setShowChangePassword(false); resetPasswordForm(); }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: COLORS.textMuted, fontSize: '1.25rem', lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{
                            padding: '1.25rem',
                            display: 'flex', flexDirection: 'column', gap: '0.85rem',
                        }}>
                            {(['Current Password', 'New Password', 'Confirm New Password'] as const).map((label, i) => {
                                const values = [currentPassword, newPassword, confirmPassword];
                                const setters = [setCurrentPassword, setNewPassword, setConfirmPassword];
                                return (
                                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ fontSize: '0.875rem', color: COLORS.textMuted }}>{label}</label>
                                        <input
                                            type="password"
                                            value={values[i]}
                                            onChange={(e) => setters[i](e.target.value)}
                                            disabled={isSubmitting}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '4px',
                                                border: `1px solid ${COLORS.borderPrimary}`,
                                                backgroundColor: COLORS.backgroundPrimary,
                                                color: COLORS.textPrimary,
                                                fontSize: '0.95rem',
                                            }}
                                        />
                                    </div>
                                );
                            })}

                            {passwordError && (
                                <p style={{ margin: 0, color: COLORS.dangerText, fontSize: '0.875rem' }}>
                                    {passwordError}
                                </p>
                            )}
                            {passwordSuccess && (
                                <p style={{ margin: 0, color: COLORS.success, fontSize: '0.875rem' }}>
                                    {passwordSuccess}
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderTop: `1px solid ${COLORS.borderPrimary}`,
                            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                        }}>
                            <button
                                type="button"
                                onClick={handleChangePassword}
                                disabled={isSubmitting}
                                style={{
                                    padding: '0.55rem 1rem', borderRadius: '6px', border: 'none',
                                    background: COLORS.accentPrimary, color: COLORS.white,
                                    fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.6 : 1,
                                }}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Password'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowChangePassword(false); resetPasswordForm(); }}
                                disabled={isSubmitting}
                                style={{
                                    padding: '0.55rem 1rem', borderRadius: '6px',
                                    border: `1px solid ${COLORS.borderPrimary}`,
                                    background: 'transparent', color: COLORS.textPrimary,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
