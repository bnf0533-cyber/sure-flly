import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useFlightStore } from "../../store/useFlightStore";
import { useClaimStore } from "../../store/useClaimStore";

export function AppLayout() {
    const connected = useWebSocket();
    useEffect(() => {
        void useFlightStore.getState().fetch();
        void useClaimStore.getState().fetch();
    }, []);
    return (
        <div className="min-h-screen bg-canvas text-ink">
            <a href="#main-content" className="skip-link">
                Skip to content
            </a>
            <Sidebar />
            <div className="md:ml-[232px] xl:ml-[250px]">
                <NavBar connected={connected} />
                <main
                    id="main-content"
                    className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 sm:px-8 md:pb-8 lg:px-10 lg:pt-9"
                >
                    <Outlet />
                    <Footer />
                </main>
            </div>
        </div>
    );
}
