import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader } from "./common/Loader";

export function ProtectedRoute() {
    const { token, user, ready } = useAuthStore();
    const location = useLocation();
    if (!ready) {
        return <Loader fullPage />;
    }
    if (!token || !user) {
        return (
            <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
        );
    }
    return <Outlet />;
}
