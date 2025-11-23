import React, { useState, useEffect, useCallback, useRef } from "react";
import InfoTip from "../common/InfoTip";
import { IoRefresh } from "react-icons/io5";
import { Range, getTrackBackground } from "react-range";
import { GRAPHQL_URL } from "../../utils/api";

export default function PreferencesPanel({
    campus, setCampus,
    delivery, setDelivery,
    term, setTerm,
    optimizeFreeTime, setOptimizeFreeTime,
    darkMode, setDarkMode,
    timeRange, setTimeRange,
    animOut, animIn
}) {
    const [availableTerms, setAvailableTerms] = useState([]);
    const [termsLoading, setTermsLoading] = useState(true);
    const trackValuesRef = useRef([8, 18]);
    const trackElRef = useRef(null);
    const trackRafRef = useRef(0);

    const updateTrackBg = (vals) => {
        try {
            const el = trackElRef.current;
            if (!el) return;
            const sorted = [...vals].sort((a, b) => a - b);
            if (trackRafRef.current) cancelAnimationFrame(trackRafRef.current);
            trackRafRef.current = requestAnimationFrame(() => {
                el.style.background = getTrackBackground({
                    values: sorted,
                    colors: [darkMode ? '#2a2a2a' : '#e5e7eb', '#ff3b30', darkMode ? '#2a2a2a' : '#e5e7eb'],
                    min: 6,
                    max: 22,
                });
            });
        } catch { }
    };

    useEffect(() => { trackValuesRef.current = timeRange; updateTrackBg(timeRange); return () => { if (trackRafRef.current) cancelAnimationFrame(trackRafRef.current); }; }, [timeRange, darkMode]);

    const formatTime = (val) => {
        const hour = Math.floor(val);
        const min = val % 1 === 0.5 ? "30" : "00";
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:${min} ${ampm}`;
    };

    // Fetch terms function (can be called on reload)
    const fetchTerms = useCallback(async () => {
        setTermsLoading(true);
        try {
            const query = `
            query {
              getTerms {
                ... on SuccessField {
                  fields { name }
                }
                ... on ErrorField { error message }
              }
            }
            `;
            let data = null;
            try {
                const res = await fetch(GRAPHQL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
                data = await res.json();
            } catch { }
            // If empty or error, try Electron main-process fallback
            let node = data?.data?.getTerms || {};
            let list = Array.isArray(node?.fields) ? node.fields : (Array.isArray(node?.terms) ? node.terms : []);
            if ((list.length === 0 || node?.error) && window.electronAPI?.graphql) {
                const m = await window.electronAPI.graphql(query, GRAPHQL_URL);
                if (m?.data) {
                    data = m.data;
                    node = data?.data?.getTerms || {};
                    list = Array.isArray(node?.fields) ? node.fields : (Array.isArray(node?.terms) ? node.terms : []);
                }
            }
            const parsed = list.map(t => String(t?.name || '')).filter(Boolean);
            const mapSeason = (code) => {
                const y = code.slice(0, 4);
                const s = code.slice(4);
                const season = s === '10' ? 'Fall' : s === '15' ? 'Winter' : s === '20' ? 'Spring' : s === '30' ? 'Summer' : s;
                return `${season} ${y}`;
            };
            const seen = new Set();
            const firstFour = [];
            for (const c of parsed) { if (!seen.has(c)) { seen.add(c); firstFour.push(c); } if (firstFour.length === 4) break; }
            const opts = firstFour.map(c => ({ code: c, label: mapSeason(c) }));
            try { console.debug('terms parsed', { rawCount: list.length, parsed, firstFour: opts }); } catch { }
            setAvailableTerms(opts);
            if (opts.length && !opts.some(o => o.code === term)) setTerm(opts[0].code);
        } finally { setTermsLoading(false); }
    }, [term, setTerm]);

    // Fetch terms once on mount
    useEffect(() => {
        fetchTerms();
    }, [fetchTerms]);

    const toggleCampus = (code) => {
        if (code === "All") {
            setCampus(["All"]);
            return;
        }
        setCampus((prev) => {
            const filtered = prev.filter((c) => c !== "All");
            return filtered.includes(code)
                ? filtered.filter((c) => c !== code)
                : [...filtered, code];
        });
    };
    const isCampusSelected = (code) => campus.includes(code);

    const toggleDelivery = (code) => {
        setDelivery((prev) => {
            const filtered = prev.filter((c) => c !== "All");
            return filtered.includes(code)
                ? filtered.filter((c) => c !== code)
                : [...filtered, code];
        });
    };
    const isDeliverySelected = (code) => delivery.includes(code);

    return (
        <div className={`prefs-panel page-anim ${animOut ? 'anim-out' : ''} ${animIn ? 'anim-in' : ''}`}>
            <div className="panel prefs-panel" style={{ maxHeight: '100%', overflowY: 'auto' }}>
                <h4>Preferences</h4>

                <div className="prefs-row">
                    <span>
                        Campus
                        <div className="info-container">
                            <InfoTip isDark={darkMode} content={<span>Select one or more campuses. Choosing "All" will ignore other campus filters.</span>} />
                        </div>
                    </span>
                    <div className="choice-group multi">
                        {[
                            { label: "Oxford", code: "O" },
                            { label: "Hamilton", code: "M" },
                            { label: "Luxembourg", code: "L" },
                            { label: "All", code: "All" }
                        ].map((opt) => (
                            <button
                                key={opt.code}
                                className={`choice-button ${isCampusSelected(opt.code) ? 'selected' : ''}`}
                                onClick={() => toggleCampus(opt.code)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="prefs-row">
                    <span>
                        Types of Courses
                        <div className="info-container">
                            <InfoTip isDark={darkMode} content={<span>Select which type of classes you want in your schedule. (Online, In-Person)</span>} />
                        </div>
                    </span>
                    <div className="choice-group multi">
                        {[
                            { label: "In-Person", code: "Face2Face" },
                            { label: "Online Synchronous", code: "ONLS" },
                            { label: "Online Asynchronous", code: "ONLA" },
                            { label: "Hybrid Synchronous", code: "HYBS" },
                            { label: "Hybrid Asynchronous", code: "HYBA" },
                            { label: "Interactive Video", code: "IVDL" },
                            { label: "Study Abroad", code: "SA" },
                            { label: "Study Away", code: "AWAY" },
                        ].map((opt) => (
                            <button
                                key={opt.code}
                                className={`choice-button ${isDeliverySelected(opt.code) ? 'selected' : ''}`}
                                onClick={() => toggleDelivery(opt.code)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="prefs-row">
                    <span>
                        Term
                        <div className="info-container">
                            <InfoTip isDark={darkMode} content={<span>Choose a single academic term.</span>} />
                        </div>
                    </span>
                    <div className="choice-group single">
                        {availableTerms.length ? (
                            availableTerms.map((opt) => (
                                <button
                                    key={opt.code}
                                    className={`choice-button ${term === opt.code ? 'selected' : ''}`}
                                    onClick={() => setTerm(opt.code)}
                                >
                                    {opt.label}
                                </button>
                            ))
                        ) : termsLoading ? (
                            <span className="muted">Loading terms…</span>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="muted">No terms available</span>
                                <button
                                    className="choice-button"
                                    onClick={fetchTerms}
                                    style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                    title="Reload terms"
                                >
                                    <IoRefresh size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="switch-container">
                    <span>
                        Optimize Free Time
                        <div className="info-container">
                            <InfoTip isDark={darkMode} content={<span>Attempt to schedule classes with larger gaps in between to give you more free time during the day.</span>} />
                        </div>
                    </span>
                    <label className="switch">
                        <input type="checkbox" checked={optimizeFreeTime} onChange={() => setOptimizeFreeTime(!optimizeFreeTime)} />
                        <span className="slider round" />
                    </label>
                </div>

                <div className="switch-container">
                    <span>
                        Dark Mode
                        <div className="info-container">
                            <InfoTip isDark={darkMode} content={<span>Toggle dark mode for the app</span>} />
                        </div>
                    </span>
                    <label className="switch">
                        <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                        <span className="slider round" />
                    </label>
                </div>

                <div className="prefs-row prefs-time-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div className="prefs-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>Preferred Time: {formatTime(timeRange[0])} - {formatTime(timeRange[1])}</span>
                        <div className="info-container">
                            <InfoTip isDark={darkMode} content={<span>Set the earliest and latest times you prefer your classes to be scheduled.</span>} />
                        </div>
                    </div>
                    <div className="time-slider" style={{ width: '100%', marginTop: '8px' }}>
                        <Range
                            step={0.5}
                            min={6}
                            max={22}
                            values={timeRange}
                            onChange={(values) => { trackValuesRef.current = values; updateTrackBg(values); setTimeRange(values); }}
                            renderTrack={({ props, children }) => (
                                <div
                                    {...props}
                                    ref={(node) => { trackElRef.current = node; const r = props.ref; if (typeof r === 'function') { r(node); } else if (r && typeof r === 'object') { try { r.current = node; } catch { } } }}
                                    className="range-track"
                                    style={{
                                        ...props.style,
                                        background: getTrackBackground({
                                            values: [...(trackValuesRef.current || timeRange)].sort((a, b) => a - b),
                                            colors: [darkMode ? '#2a2a2a' : '#e5e7eb', '#ff3b30', darkMode ? '#2a2a2a' : '#e5e7eb'],
                                            min: 6,
                                            max: 22,
                                        })
                                    }}
                                >
                                    {children}
                                </div>
                            )}
                            renderThumb={({ props }) => (
                                <div {...props} className="range-thumb" />
                            )}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
