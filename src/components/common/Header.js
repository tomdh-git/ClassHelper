import React from "react";
import { IoSunny, IoMoon } from "react-icons/io5";

export default function Header({ activePage, startPageTransition, darkMode, toggleTheme }) {
    return (
        <div className="header-bar">
            <div className="logo-text">
                <img src={`${process.env.PUBLIC_URL}/assets/img/${darkMode ? 'logo_dark.png' : 'logo_light.png'}`} alt="Logo" className="app-logo" />
                <h2>ClassHelper</h2>
            </div>
            <div className="nav-buttons">
                <button onClick={() => startPageTransition("planner")} className={activePage === "planner" ? "active" : ""}>Planner</button>
                <button onClick={() => startPageTransition("search")} className={activePage === "search" ? "active" : ""}>Search</button>
                <button onClick={() => startPageTransition("prefs")} className={activePage === "prefs" ? "active" : ""}>Preferences</button>
                <button className="dark-btn" onClick={toggleTheme} title="Toggle dark mode" aria-label="Toggle theme">
                    <span className="icon-wrap">{darkMode ? <IoSunny size={22} /> : <IoMoon size={22} />}</span>
                </button>
                <button className="close-btn" onClick={() => { if (window.electronAPI?.closeApp) { window.electronAPI.closeApp(); } else { window.close(); } }} title="Close" aria-label="Close">
                    <span style={{ fontWeight: 900 }}>×</span>
                </button>
            </div>
        </div>
    );
}
