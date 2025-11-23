import { useEffect, useRef } from "react";

export function useTheme(darkMode, setDarkMode) {
    const appRef = useRef(null);

    const toggleTheme = () => {
        const root = appRef.current;
        if (!root) { setDarkMode(!darkMode); return; }
        const maxDelay = 280; // ms
        const rootRect = root.getBoundingClientRect();
        const nodes = root.querySelectorAll('*');
        nodes.forEach((el) => {
            const r = el.getBoundingClientRect();
            const rel = Math.max(0, Math.min(1, (r.top - rootRect.top) / Math.max(1, rootRect.height)));
            const delay = rel * maxDelay;
            el.style.setProperty('--theme-delay', `${delay}ms`);
        });
        root.classList.add('theme-stagger');
        setDarkMode(!darkMode);
        setTimeout(() => {
            nodes.forEach((el) => el.style.removeProperty('--theme-delay'));
            root.classList.remove('theme-stagger');
        }, maxDelay + 400);
    };

    // Sync root html class with state and remove preload style once ready
    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) root.classList.add('dark-mode'); else root.classList.remove('dark-mode');
        const s = document.getElementById('preload-theme-style');
        if (s) s.remove();
    }, [darkMode]);

    return { appRef, toggleTheme };
}
