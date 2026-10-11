import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Plane } from "lucide-react";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Toast } from "./components/common/Toast";
import { EmptyState } from "./components/common/States";
import { useAuthStore } from "./store/authStore";
import { useNotificationStore } from "./store/useNotificationStore";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TrackedFlightListPage from "./pages/TrackedFlightListPage";
import TrackedFlightFormPage from "./pages/TrackedFlightFormPage";
import ClaimsListPage from "./pages/ClaimsListPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
    useEffect(() => {
        const expired = () => {
            useAuthStore.getState().logout();
            useNotificationStore
                .getState()
                .add({
                    type: "info",
                    title: "אנא התחבר שוב",
                    message: "תוקף ההתחברות שלך פג.",
                });
        };
        window.addEventListener("sureflight:session-expired", expired);
        void useAuthStore.getState().initialize();
        return () =>
            window.removeEventListener("sureflight:session-expired", expired);
    }, []);

    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route index element={<DashboardPage />} />
                        <Route
                            path="flights"
                            element={<TrackedFlightListPage />}
                        />
                        <Route
                            path="flights/new"
                            element={<TrackedFlightFormPage />}
                        />
                        <Route path="claims" element={<ClaimsListPage />} />
                        <Route path="account" element={<ProfilePage />} />
                        <Route
                            path="*"
                            element={
                                <div className="card">
                                    <EmptyState
                                        icon={<Plane size={25} />}
                                        title="הנתיב הזה מחוץ למפה"
                                        description="בוא נחזיר אותך לסביבת העבודה שלך."
                                        action={
                                            <Link
                                                to="/"
                                                className="btn btn-primary"
                                            >
                                                חזרה לסקירה הכללית
                                            </Link>
                                        }
                                    />
                                </div>
                            }
                        />
                    </Route>
                </Route>
            </Routes>
            <Toast />
        </>
    );
}
