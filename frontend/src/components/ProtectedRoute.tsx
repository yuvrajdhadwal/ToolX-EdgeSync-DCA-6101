import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// - If no token: redirect to /login
// - If token exists: optionally verify with backend
export default function ProtectedRoute({ children }: Props) {
  const token = localStorage.getItem("token");
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // No token => definitely not logged in
    if (!token) {
      setAllowed(false);
      return;
    }

    //  verify token via the endpoint
    // NOTE: encodeURIComponent because JWT has '.' characters
    fetch(`/verify-token/${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.ok) {
            setAllowed(true);
        } else {
            setAllowed(false);
        }
      })
      .catch(() => setAllowed(false));
  }, [token]);

  // While verifying, avoid flashing protected page
  if (allowed === null) return <div>Loading...</div>;

  if (!allowed) return <Navigate to={ROUTES.LOGIN} replace />;

  return children;
}