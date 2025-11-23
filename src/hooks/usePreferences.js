import { useState, useEffect, useRef } from "react";

const CONFIG_KEY = 'classhelperConfig:v1';

export function usePreferences() {
    const [delivery, setDelivery] = useState(["Face2Face"]);
    const [campus, setCampus] = useState(["O"]);
    const [term, setTerm] = useState("202620");
    const [optimizeFreeTime, setOptimizeFreeTime] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [timeRange, setTimeRange] = useState([8, 18]);
    const [activePage, setActivePage] = useState("planner");
    const [courses, setCourses] = useState([{ value: "CSE 374", valid: true }]);
    const [fillerAttrs, setFillerAttrs] = useState([]);

    const hydratedRef = useRef(false);
    const baselinePrefsRef = useRef({ campus, term, optimizeFreeTime, timeRange });

    const readConfigBridge = async () => {
        if (typeof window !== 'undefined' && window.electronAPI?.readConfig) {
            try { return await window.electronAPI.readConfig(); } catch { }
        }
        try {
            const raw = localStorage.getItem(CONFIG_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    };

    const writeConfigBridge = async (cfg) => {
        if (typeof window !== 'undefined' && window.electronAPI?.writeConfig) {
            try { await window.electronAPI.writeConfig(cfg); return; } catch { }
        }
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { }
    };

    // Load on startup
    useEffect(() => {
        (async () => {
            const cfg = await readConfigBridge();
            if (cfg && typeof cfg === 'object') {
                if (Array.isArray(cfg.campus)) setCampus(cfg.campus);
                if (typeof cfg.term === 'string') setTerm(cfg.term);
                if (typeof cfg.optimizeFreeTime === 'boolean') setOptimizeFreeTime(cfg.optimizeFreeTime);
                if (typeof cfg.darkMode === 'boolean') setDarkMode(cfg.darkMode);
                if (Array.isArray(cfg.timeRange) && cfg.timeRange.length === 2) setTimeRange(cfg.timeRange);
                if (Array.isArray(cfg.courses)) setCourses(cfg.courses);
                if (Array.isArray(cfg.fillerAttrs)) setFillerAttrs(cfg.fillerAttrs);
                if (typeof cfg.activePage === 'string') setActivePage(cfg.activePage);
                baselinePrefsRef.current = {
                    campus: Array.isArray(cfg.campus) ? cfg.campus : campus,
                    term: typeof cfg.term === 'string' ? cfg.term : term,
                    optimizeFreeTime: typeof cfg.optimizeFreeTime === 'boolean' ? cfg.optimizeFreeTime : optimizeFreeTime,
                    timeRange: Array.isArray(cfg.timeRange) ? cfg.timeRange : timeRange,
                };
            } else {
                // create default config
                const defaults = {
                    campus,
                    term,
                    optimizeFreeTime,
                    darkMode,
                    timeRange,
                    courses,
                    fillerAttrs,
                    activePage,
                };
                await writeConfigBridge(defaults);
                baselinePrefsRef.current = { campus, term, optimizeFreeTime, timeRange };
            }
            hydratedRef.current = true;
        })();
    }, []);

    // Save whenever relevant state changes (after hydration)
    const prevCfgRef = useRef(null);
    useEffect(() => {
        if (!hydratedRef.current) return;
        const cfg = { campus, term, optimizeFreeTime, darkMode, timeRange, courses, fillerAttrs, activePage };
        const prev = prevCfgRef.current ? JSON.stringify(prevCfgRef.current) : null;
        const cur = JSON.stringify(cfg);
        if (prev !== cur) {
            prevCfgRef.current = cfg;
            writeConfigBridge(cfg);
        }
    }, [campus, term, optimizeFreeTime, darkMode, timeRange, courses, fillerAttrs, activePage]);

    const snapshotPrefs = () => ({ campus, term, optimizeFreeTime, timeRange });
    const sameArrayUnordered = (a = [], b = []) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const sa = [...a].sort();
        const sb = [...b].sort();
        for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
        return true;
    };
    const prefsChangedFromBaseline = () => {
        const cur = snapshotPrefs();
        const base = baselinePrefsRef.current || {};
        const campusChanged = !sameArrayUnordered(cur.campus, base.campus);
        return campusChanged || cur.term !== base.term || cur.optimizeFreeTime !== base.optimizeFreeTime || cur.timeRange?.[0] !== base.timeRange?.[0] || cur.timeRange?.[1] !== base.timeRange?.[1];
    };

    return {
        delivery, setDelivery,
        campus, setCampus,
        term, setTerm,
        optimizeFreeTime, setOptimizeFreeTime,
        darkMode, setDarkMode,
        timeRange, setTimeRange,
        activePage, setActivePage,
        courses, setCourses,
        fillerAttrs, setFillerAttrs,
        baselinePrefsRef,
        prefsChangedFromBaseline
    };
}
