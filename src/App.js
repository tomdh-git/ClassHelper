import React, { useEffect, useRef, useState, useCallback } from "react";
import InfoTip from "./components/common/InfoTip";
import { Range, getTrackBackground } from "react-range";
import "./styles/index.css";
import { IoClose, IoChevronUp, IoChevronDown, IoSunny, IoMoon, IoRefresh } from "react-icons/io5";
import FluidGlassBackground from "./components/FluidGlassBackground";

const BASE_URL = "https://courseapi-production-3751.up.railway.app";
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const ALIVE_URL = `${BASE_URL}/alive`;

export default function App() {
    const [activePage, setActivePage] = useState("planner");
    const [animOut, setAnimOut] = useState(false);
    const [animIn, setAnimIn] = useState(false);
    const [courses, setCourses] = useState([{ value: "CSE 374", valid: true }]);
    const [input, setInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generateCooldown, setGenerateCooldown] = useState(false);
    const [searchCooldown, setSearchCooldown] = useState(false);
    const generateCooldownRef = useRef(false);
    const searchCooldownRef = useRef(false);
    const generateCooldownTimeoutRef = useRef(null);
    const searchCooldownTimeoutRef = useRef(null);
    const [lastError, setLastError] = useState(null);

    // Search state
    const [crnInput, setCrnInput] = useState("");
    const [courseSearchInput, setCourseSearchInput] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    // Filler attributes (search card)
    const ATTRIBUTE_MAP = [
        { code: "PA1C", label: "Advanced Writing" },
        { code: "PA3A", label: "Creative Arts" },
        { code: "PA1B", label: "English Composition" },
        { code: "PA4A", label: "Ethical Citizenship" },
        { code: "PA4C", label: "Global Inquiry" },
        { code: "PA3B", label: "Humanities" },
        { code: "PA1A", label: "Math, Formal Reasoning" },
        { code: "PA2B", label: "Natural Sciences" },
        { code: "PA2A", label: "Social Sciences" },
        { code: "PA4B", label: "Intercult'l Consciousness" },
        { code: "ADVW", label: "Advanced Writing" },
        { code: "EL", label: "Experiential Learning" },
        { code: "IVA", label: "Biological Science" },
        { code: "IIA", label: "Creative Arts" },
        { code: "I", label: "English" },
        { code: "GCRS", label: "Global Course" },
        { code: "IIB", label: "Humanities" },
        { code: "V", label: "MTH, Reasoning" },
        { code: "IVB", label: "Physical Science" },
        { code: "IIC", label: "Social Science" },
        { code: "IIIB", label: "World Cultures" },
        { code: "HONC", label: "Honors Course" },
        { code: "IC", label: "Intercultural Perspectives" },
        { code: "SI04", label: "Creativity, Story, Design" },
        { code: "SI05", label: "Global Health, Wellness" },
        { code: "SI02", label: "Power, Justice, Change" },
        { code: "SI01", label: "Sustainability" },
        { code: "SI03", label: "Tech, Info, Society" },
        { code: "SC", label: "Senior Capstone" },
        { code: "SL", label: "Service Learning" },
        { code: "TS", label: "Thematic Sequence" },
    ];
    const ATTR_LABELS = Object.fromEntries(ATTRIBUTE_MAP.map(a => [a.code, a.label]));
    const [fillerAttrs, setFillerAttrs] = useState([]);
    const toggleFillerAttr = (code) => {
        setFillerAttrs(prev => prev.includes(code)
            ? prev.filter(a => a !== code)
            : [code, ...prev]);
    };
    const addFillerToPlanner = () => {
        if (fillerAttrs.length === 0) { notify("Select at least one attribute", "error"); return; }
        setCourses(prev => [...prev, { type: 'filler', value: 'FILLER', valid: true, attrs: [...fillerAttrs] }]);
        notify("Filler added to planner", "info");
    };

    const [delivery, setDelivery] = useState(["Face2Face"]); // allow multi-select (e.g., ["O", "M"]) or ["All"]
    const [campus, setCampus] = useState(["O"]); // allow multi-select (e.g., ["O", "M"]) or ["All"]
    const [term, setTerm] = useState("202620");
    const [optimizeFreeTime, setOptimizeFreeTime] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
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
    const [timeRange, setTimeRange] = useState([8, 18]);
    const [availableTerms, setAvailableTerms] = useState([]);
    const [termsLoading, setTermsLoading] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const trackValuesRef = useRef([8,18]);
    const trackElRef = useRef(null);
    const trackRafRef = useRef(0);
    const updateTrackBg = (vals) => {
        try {
            const el = trackElRef.current;
            if (!el) return;
            const sorted = [...vals].sort((a,b)=>a-b);
            if (trackRafRef.current) cancelAnimationFrame(trackRafRef.current);
            trackRafRef.current = requestAnimationFrame(() => {
                el.style.background = getTrackBackground({
                    values: sorted,
                    colors: [darkMode ? '#2a2a2a' : '#e5e7eb', '#ff3b30', darkMode ? '#2a2a2a' : '#e5e7eb'],
                    min: 6,
                    max: 22,
                });
            });
        } catch {}
    };
    useEffect(() => { trackValuesRef.current = timeRange; updateTrackBg(timeRange); return () => { if (trackRafRef.current) cancelAnimationFrame(trackRafRef.current); }; }, [timeRange, darkMode]);

    // Show splash for a short time on startup, independent of network
    useEffect(() => {
        const id = setTimeout(() => setShowSplash(false), 450);
        return () => clearTimeout(id);
    }, []);
    const [currentIndex, setCurrentIndex] = useState(0);
    // Toasts and stale-generation indicator
    const [toasts, setToasts] = useState([]);
    const [needsRegenerate, setNeedsRegenerate] = useState(false);
    // Color assignment for courses across UI (results chips + visualizer)
    const [courseHues, setCourseHues] = useState({}); // key -> hue (0-360)

    const courseKey = (c) => `${c.subject || ''}-${c.courseNum || ''}-${c.crn || ''}`;
    const hashHue = (str) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
        return h % 360;
    };
    const hueForCourse = (c) => {
        const key = courseKey(c);
        return courseHues[key] ?? 200; // default hue
    };
    const chipStyleForHue = (h) => {
        if (darkMode) {
            return {
                '--chip-bg': `hsla(${h}, 70%, 18%, 0.65)`,
                '--chip-border': `hsla(${h}, 80%, 58%, 0.5)`,
                '--chip-fg': '#f5f5f7',
            };
        }
        return {
            '--chip-bg': `hsla(${h}, 95%, 95%, 1)`,
            '--chip-border': `hsla(${h}, 70%, 70%, 0.8)`,
            '--chip-fg': '#1f2937',
        };
    };
    const eventStyleForHue = (h) => {
        if (darkMode) {
            return {
                '--ev-bg': `hsla(${h}, 70%, 45%, 0.28)`,
                '--ev-border': `hsla(${h}, 80%, 60%, 0.55)`,
                '--ev-fg': '#ffffff',
            };
        }
        return {
            '--ev-bg': `hsla(${h}, 90%, 65%, 0.20)`,
            '--ev-border': `hsla(${h}, 85%, 55%, 0.5)`,
            '--ev-fg': '#1f2937',
        };
    };

    // Extract meeting times from a course node (supports multiple shapes)
    const dayCodeToName = (d) => ({ 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'R': 'Thu', 'Th': 'Thu', 'H': 'Thu', 'F': 'Fri', 'S': 'Sat', 'U': 'Sun' }[d] || d);
    const parseTimeStr = (s) => {
        if (!s) return null;
        const str = String(s).trim().toLowerCase();
        const m = str.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)?\s*$/);
        if (!m) return null;
        let hr = parseInt(m[1], 10);
        const min = m[2] ? parseInt(m[2], 10) : 0;
        const ap = m[3];
        if (ap) {
            if (ap === 'pm' && hr < 12) hr += 12;
            if (ap === 'am' && hr === 12) hr = 0;
        }
        if (!ap && hr <= 24 && min <= 59) {
            // assume 24h
        }
        return hr * 60 + min;
    };
    const expandDays = (daysStr) => {
        if (!daysStr) return [];
        const s = String(daysStr);
        // Handle "Th" specially, replace with R token then process chars
        const replaced = s.replace(/Th/gi, 'R');
        return Array.from(replaced).map(dayCodeToName);
    };
    const extractMeetings = (c) => {
        if (!c) return [];
        const allMeetings = [];

        // First, check for array of meetings (handles multiple meeting times)
        if (Array.isArray(c.meetings)) {
            const parsed = c.meetings.map(m => ({
                day: dayCodeToName(m.day || m.d || m.D),
                start: parseTimeStr(m.start || m.s),
                end: parseTimeStr(m.end || m.e)
            })).filter(m => Number.isFinite(m.start) && Number.isFinite(m.end));
            allMeetings.push(...parsed);
        }

        // Also check for single days/start/end fields (might be a separate meeting)
        const days = c.days || c.meetingDays || c.DayPattern;
        const start = c.start || c.startTime || c.timeStart;
        const end = c.end || c.endTime || c.timeEnd;
        if (days && (start || end)) {
            const startMin = parseTimeStr(start);
            const endMin = parseTimeStr(end);
            if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
                const parsed = expandDays(days).map(d => ({ day: d, start: startMin, end: endMin }));
                // Only add if not already in allMeetings (avoid duplicates)
                for (const p of parsed) {
                    const exists = allMeetings.some(m =>
                        m.day === p.day && m.start === p.start && m.end === p.end
                    );
                    if (!exists) allMeetings.push(p);
                }
            }
        }

        // Try to parse from delivery string - handle multiple time patterns
        const delivery = c.delivery || c.Delivery || '';
        const dlc = String(delivery).trim();

        // Match multiple time patterns in delivery string (e.g., "MWF 10:30am-11:20am MWF 1:15pm-2:10pm")
        const timePatterns = dlc.matchAll(/([MTWRFSU]+)\s+(\d{1,2})(?::(\d{2}))?\s*([ap]m)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)/gi);
        for (const match of timePatterns) {
            const dpat = match[1].toUpperCase();
            const s = `${match[2]}${match[3] ? ':'+match[3] : ''}${match[4].toLowerCase()}`;
            const e = `${match[5]}${match[6] ? ':'+match[6] : ''}${match[7].toLowerCase()}`;
            const startMin = parseTimeStr(s);
            const endMin = parseTimeStr(e);
            if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
                const parsed = expandDays(dpat).map(d => ({ day: d, start: startMin, end: endMin }));
                // Only add if not already in allMeetings
                for (const p of parsed) {
                    const exists = allMeetings.some(m =>
                        m.day === p.day && m.start === p.start && m.end === p.end
                    );
                    if (!exists) allMeetings.push(p);
                }
            }
        }

        // Also try single pattern match for backward compatibility
        if (allMeetings.length === 0) {
            const dm = dlc.match(/^\s*([MTWRFSU]+)/i);
            const tm = dlc.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
            if (dm && tm) {
                const dpat = dm[1].toUpperCase();
                const s = `${tm[1]}${tm[2] ? ':'+tm[2] : ''}${tm[3].toLowerCase()}`;
                const e = `${tm[4]}${tm[5] ? ':'+tm[5] : ''}${tm[6].toLowerCase()}`;
                const startMin = parseTimeStr(s);
                const endMin = parseTimeStr(e);
                if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
                    const parsed = expandDays(dpat).map(d => ({ day: d, start: startMin, end: endMin }));
                    allMeetings.push(...parsed);
                }
            }
        }

        return allMeetings;
    };

    const parseDeliveryDays = (s) => {
        if (!s) return null;
        const lc = String(s).trim().toLowerCase();
        if (/\bweb\b/.test(lc) && !/^\s*[mtwrfsu]+\b/.test(lc)) return 'WEB';
        const m = lc.match(/^\s*([mtwrfsu]+)\b/);
        return m ? m[1].toUpperCase() : null;
    };

    // Snap scroll indicators for right panel
    const snapScrollRef = useRef(null);
    const [hasMoreAbove, setHasMoreAbove] = useState(false);
    const [hasMoreBelow, setHasMoreBelow] = useState(false);

    const formatTimeForQuery = (val) => {
        const hour = Math.floor(val);
        const min = val % 1 === 0.5 ? "30" : "00";
        const ampm = hour >= 12 ? "pm" : "am";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:${min}${ampm}`;
    };

    const addCourse = async () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        if (courses.some(c => c.value.toLowerCase() === trimmed.toLowerCase())) return;
        const newIndex = courses.length;
        setCourses(prev => [...prev, { value: trimmed, valid: null }]);
        setInput("");
        // Validate asynchronously
        await validateCourseEntry(trimmed, newIndex);
    };

    // Campus selection helpers (multi-select with "All")
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

    const removeCourse = (i) => setCourses(courses.filter((_, idx) => idx !== i));

    const checkAlive = async () => {
        try {
            setLoading(true);
            const res = await fetch(ALIVE_URL);
            if (!res.ok) throw new Error("Service responded but not OK");
            return true;
        } catch {
            setLastError("Service is unreachable");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toGqlStringArray = (arr = []) => `[${arr.map((val) => JSON.stringify(val)).join(", ")}]`;

    const getSchedules = async () => {
        // Check cooldown
        if (generateCooldownRef.current) return;

        setLastError(null);
        if (!(await checkAlive())) return;

        // Clear any existing timeout
        if (generateCooldownTimeoutRef.current) {
            clearTimeout(generateCooldownTimeoutRef.current);
        }

        // Set cooldown
        generateCooldownRef.current = true;
        setGenerateCooldown(true);

        const freeTimeFields = optimizeFreeTime ? "freeTime" : "";
        const courseVals = courses
            .filter(c => c.type !== 'filler' && c.valid !== false)
            .map(c => c.value);
        const fillerAttrUnion = Array.from(new Set(
            courses.filter(c => c.type === 'filler').flatMap(c => c.attrs || [])
        ));
        const baseTimeLines = optimizeFreeTime ? `preferredStart: "${formatTimeForQuery(timeRange[0])}"\r
            preferredEnd: "${formatTimeForQuery(timeRange[1])}"` : "";

        const buildScheduleQuery = () => `
        query {
          getScheduleByCourses(
            courses: ${toGqlStringArray(courseVals)}
            campus: ${toGqlStringArray(campus)}
            term: "${term}"\r
            optimizeFreeTime: ${optimizeFreeTime}
            ${baseTimeLines}
            delivery: ${toGqlStringArray(delivery)}
          ) {
            ... on SuccessSchedule {
              schedules { courses { subject courseNum crn delivery } ${freeTimeFields} }
            }
            ... on ErrorSchedule { error message }
          }
        }`;

        const buildFillerQuery = () => `
        query {
          getFillerByAttributes(
            attributes: ${toGqlStringArray(fillerAttrUnion)}
            courses: ${toGqlStringArray(courseVals)}
            campus: ${toGqlStringArray(campus)}
            term: "${term}"\r
            ${baseTimeLines}
            delivery: ${toGqlStringArray(delivery)}
          ) {
            ... on SuccessSchedule {
              schedules { courses { subject courseNum crn delivery } ${freeTimeFields} }
            }
            ... on ErrorSchedule { error message }
          }
        }`;

        const isFillerMode = fillerAttrUnion.length > 0;
        const query = isFillerMode ? buildFillerQuery() : buildScheduleQuery();
        console.log(query);

        // Helpers to process large result sets
        const schedKey = (s) => {
            try {
                const crns = (s?.courses || []).map(c => String(c?.crn ?? '')).filter(Boolean).sort();
                return crns.join('_');
            } catch { return ''; }
        };
        const dedupeSchedules = (arr = []) => {
            const seen = new Set();
            const out = [];
            for (const s of arr) {
                const k = schedKey(s);
                if (!seen.has(k)) { seen.add(k); out.push(s); }
            }
            return out;
        };

        let schedulesProc;
        try {
            setLoading(true);
            setIsGenerating(true);
            setNeedsRegenerate(false);
            // First attempt: renderer fetch
            let res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            let rawText = await res.text();
            let data = null;
            try { data = JSON.parse(rawText); } catch { data = { parseError: true, raw: rawText }; }
            const key = fillerAttrUnion.length > 0 ? 'getFillerByAttributes' : 'getScheduleByCourses';
            let node = data?.data?.[key] || null;
            schedulesProc = Array.isArray(node?.schedules) ? node.schedules : [];

            // If HTTP not ok or union is error or 0 schedules, try main-process fetch fallback (Electron only)
            const shouldFallback = !res.ok || (node && node.error) || schedulesProc.length === 0;
            if (shouldFallback && window.electronAPI?.graphql) {
                const mres = await window.electronAPI.graphql(query, GRAPHQL_URL);
                if (mres?.data) {
                    data = mres.data;
                    node = data?.data?.[key] || null;
                    schedulesProc = Array.isArray(node?.schedules) ? node.schedules : [];
                }
            }

            if (schedulesProc.length > 30) {
                const deduped = dedupeSchedules(schedulesProc);
                schedulesProc = deduped.length > 10 ? deduped.slice(0, 10) : deduped;
            }
            const nodeOut = node ? { ...node, schedules: schedulesProc } : node;
            setResult(nodeOut);
            setCurrentIndex(0);

            if (!Array.isArray(schedulesProc) || schedulesProc.length === 0) {
                const msg = node?.message || (Array.isArray(data?.errors) ? data.errors.map(e => e.message).join('; ') : 'No schedules returned');
                notify(`Generate: ${msg}`, 'error', 6000);
            }

            // Update baseline to current prefs on successful generate
            baselinePrefsRef.current = { ...snapshotPrefs() };
            // Assign hues for courses across processed schedules for stable colors
            try {
                const allCourses = (schedulesProc || []).flatMap(s => s.courses || []);
                setCourseHues(prev => {
                    const next = { ...prev };
                    for (const c of allCourses) {
                        const k = courseKey(c);
                        if (!(k in next)) next[k] = hashHue(k);
                    }
                    return next;
                });
            } catch {}
            // Auto-jump to the Generated Schedules card (slightly delayed for smoother layout)
            setTimeout(() => scrollSnapBy(1), 140);
        } catch (e) {
            setLastError("Failed to fetch");
            notify(`Generate error: ${String((e && e.message) || e)}`, 'error', 6000);
        } finally {
            setLoading(false);
            setIsGenerating(false);

            // Clear any existing timeout
            if (generateCooldownTimeoutRef.current) {
                clearTimeout(generateCooldownTimeoutRef.current);
            }

            // Check if we got results (use schedulesProc from the try block scope)
            const hasResults = schedulesProc && schedulesProc.length > 0;

            if (hasResults) {
                // Clear cooldown immediately if results returned
                generateCooldownRef.current = false;
                setGenerateCooldown(false);
            } else {
                // Reset cooldown after 8 seconds if no results
                generateCooldownTimeoutRef.current = setTimeout(() => {
                    generateCooldownRef.current = false;
                    setGenerateCooldown(false);
                }, 8000);
            }
        }
    };

    const formatTime = (val) => {
        const hour = Math.floor(val);
        const min = val % 1 === 0.5 ? "30" : "00";
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:${min} ${ampm}`;
    };

    // Search helpers
    const buildCampusArg = () => {
        const filtered = campus.includes("All") ? [] : campus;
        return filtered.length ? `campus: [${filtered.map(c => `"${c}"`).join(",")}]` : "";
    };

    const searchByCRN = async () => {
        // Check cooldown
        if (searchCooldownRef.current) return;

        setLastError(null);
        if (!(await checkAlive())) return;

        // Clear any existing timeout
        if (searchCooldownTimeoutRef.current) {
            clearTimeout(searchCooldownTimeoutRef.current);
        }

        // Set cooldown
        searchCooldownRef.current = true;
        setSearchCooldown(true);
        const crn = parseInt(crnInput, 10);
        if (Number.isNaN(crn)) {
            // Clear cooldown if validation fails
            searchCooldownRef.current = false;
            setSearchCooldown(false);
            setLastError("Enter a numeric CRN");
            return;
        }
        const query = `
        query {
          getCourseByCRN(
            crn: ${crn}
            term: "${term}"
          ) {
            ... on SuccessCourse {
              courses { subject courseNum title section crn campus credits capacity requests delivery }
            }
            ... on ErrorCourse { error message }
          }
        }`;
        let list = [];
        try {
            setLoading(true);
            setSearchResults([]); // Clear previous results while loading
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByCRN;
            list = node?.courses ?? [];
            if (list.length === 0) {
                notify(node?.message || "No results found", "error");
            }
            setSearchResults(list);
        } catch {
            setLastError("Search failed");
            notify("Search failed", "error");
        } finally {
            setLoading(false);

            // Clear any existing timeout
            if (searchCooldownTimeoutRef.current) {
                clearTimeout(searchCooldownTimeoutRef.current);
            }

            // Clear cooldown immediately if results returned, otherwise after 2 seconds
            if (list.length > 0) {
                searchCooldownRef.current = false;
                setSearchCooldown(false);
                // Scroll to results card
                setTimeout(() => searchScrollSnapBy(1), 100);
            } else {
                // Reset cooldown after 2 seconds if no results
                searchCooldownTimeoutRef.current = setTimeout(() => {
                    searchCooldownRef.current = false;
                    setSearchCooldown(false);
                }, 2000);
            }
        }
    };

    const searchByInfo = async () => {
        // Check cooldown
        if (searchCooldownRef.current) return;

        setLastError(null);
        if (!(await checkAlive())) return;

        // Clear any existing timeout
        if (searchCooldownTimeoutRef.current) {
            clearTimeout(searchCooldownTimeoutRef.current);
        }

        // Set cooldown
        searchCooldownRef.current = true;
        setSearchCooldown(true);
        const m = courseSearchInput.trim().match(/^([A-Za-z]{2,4})\s+([A-Za-z0-9]+)$/);
        if (!m) { setLastError("Use format like CSE 381"); notify("Use format like CSE 381", "error"); return; }
        const subj = m[1].toUpperCase();
        const num = m[2];
        const campusArg = buildCampusArg();
        const campusLine = campusArg ? `${campusArg}` : "";
        const query = `
        query {
          getCourseByInfo(
            term: "${term}"
            ${campusLine}
            subject: ["${subj}"]
            courseNum: "${num}"
          ) {
            ... on SuccessCourse {
              courses { subject courseNum title section crn campus credits capacity requests delivery }
            }
            ... on ErrorCourse { error message }
          }
        }`;
        let list = [];
        try {
            setLoading(true);
            setSearchResults([]); // Clear previous results while loading
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByInfo;
            list = node?.courses ?? [];
            if (list.length === 0) {
                notify(node?.message || "No results found", "error");
            }
            setSearchResults(list);
        } catch {
            setLastError("Search failed");
            notify("Search failed", "error");
        } finally {
            setLoading(false);

            // Clear any existing timeout
            if (searchCooldownTimeoutRef.current) {
                clearTimeout(searchCooldownTimeoutRef.current);
            }

            // Clear cooldown immediately if results returned, otherwise after 2 seconds
            if (list.length > 0) {
                searchCooldownRef.current = false;
                setSearchCooldown(false);
                // Scroll to results card
                setTimeout(() => searchScrollSnapBy(1), 100);
            } else {
                // Reset cooldown after 2 seconds if no results
                searchCooldownTimeoutRef.current = setTimeout(() => {
                    searchCooldownRef.current = false;
                    setSearchCooldown(false);
                }, 2000);
            }
        }
    };

    // Snap scroll indicator effects
    useEffect(() => {
        const el = snapScrollRef.current;
        if (!el) return;
        const update = () => {
            setHasMoreAbove(el.scrollTop > 4);
            setHasMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
        if (ro) ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            if (ro) ro.disconnect();
        };
    }, []);

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
            } catch {}
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
                const y = code.slice(0,4);
                const s = code.slice(4);
                const season = s === '10' ? 'Fall' : s === '15' ? 'Winter' : s === '20' ? 'Spring' : s === '30' ? 'Summer' : s;
                return `${season} ${y}`;
            };
            const seen = new Set();
            const firstFour = [];
            for (const c of parsed) { if (!seen.has(c)) { seen.add(c); firstFour.push(c); } if (firstFour.length === 4) break; }
            const opts = firstFour.map(c => ({ code: c, label: mapSeason(c) }));
            try { console.debug('terms parsed', { rawCount: list.length, parsed, firstFour: opts }); } catch {}
            setAvailableTerms(opts);
            if (opts.length && !opts.some(o => o.code === term)) setTerm(opts[0].code);
        } finally { setTermsLoading(false); }
    }, [term]);

    // Fetch terms once on mount
    useEffect(() => {
        fetchTerms();
    }, [fetchTerms]);

    // Smooth scroll helper with slower, smoother easing
    const animateScrollTo = (el, to, duration = 750) => {
        const start = el.scrollTop;
        const change = to - start;
        const startTime = performance.now();
        // EaseInOutQuint for a very smooth start/end
        const easeInOutQuint = (t) => t < 0.5
            ? 16 * t * t * t * t * t
            : 1 - Math.pow(-2 * t + 2, 5) / 2;
        // Scale duration a bit by distance (up to 1.6x for 2 viewport heights)
        const base = Math.max(500, duration);
        const ratio = Math.min(2, Math.abs(change) / Math.max(1, el.clientHeight));
        const dur = Math.min(1200, base * ratio);
        const step = (now) => {
            const elapsed = now - startTime;
            const p = Math.min(1, elapsed / dur);
            const eased = easeInOutQuint(p);
            el.scrollTop = start + change * eased;
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const scrollSnapBy = (dir) => {
        const el = snapScrollRef.current;
        if (!el) return;
        const target = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + dir * el.clientHeight));
        animateScrollTo(el, target, 750);
    };

    // Fade-out chips on results navigation
    const [chipsFading, setChipsFading] = useState(false);
    const chipsFadingTimeoutRef = useRef(null);
    const navResults = (delta) => {
        if (chipsFadingTimeoutRef.current) clearTimeout(chipsFadingTimeoutRef.current);
        setChipsFading(true);
        setCurrentIndex(i => {
            const max = Math.max(0, (result?.schedules?.length || 0) - 1);
            const next = Math.min(Math.max(i + delta, 0), max);
            return next;
        });
        chipsFadingTimeoutRef.current = setTimeout(() => setChipsFading(false), 260);
    };

    // Search snap
    const searchSnapRef = useRef(null);
    // ---------------- Config persistence ----------------
    const CONFIG_KEY = 'classhelperConfig:v1';

    const readConfigBridge = async () => {
        if (typeof window !== 'undefined' && window.electronAPI?.readConfig) {
            try { return await window.electronAPI.readConfig(); } catch {}
        }
        try {
            const raw = localStorage.getItem(CONFIG_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    };

    const writeConfigBridge = async (cfg) => {
        if (typeof window !== 'undefined' && window.electronAPI?.writeConfig) {
            try { await window.electronAPI.writeConfig(cfg); return; } catch {}
        }
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch {}
    };

    const hydratedRef = useRef(false);
    const baselinePrefsRef = useRef({ campus, term, optimizeFreeTime, timeRange });

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

    // Save whenever relevant state changes

    // Sync root html class with state and remove preload style once ready
    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) root.classList.add('dark-mode'); else root.classList.remove('dark-mode');
        const s = document.getElementById('preload-theme-style');
        if (s) s.remove();
    }, [darkMode]);

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

    // (Removed proactive dirtying/snapping; we now decide only on Planner nav)

    const startPageTransition = (target) => {
        if (target === activePage || animOut || animIn) return;
        const plannerChanged = target === 'planner' && prefsChangedFromBaseline();
        setAnimOut(true);
        setTimeout(() => {
            setActivePage(target);
            setAnimOut(false);
            setAnimIn(true);
            // Only mark and snap if user navigates to Planner and we are sure it's changed
            if (target === 'planner') {
                setNeedsRegenerate(!!plannerChanged);
                if (plannerChanged) {
                    setTimeout(() => {
                        const el = snapScrollRef.current;
                        if (el) animateScrollTo(el, 0, 700);
                    }, 220);
                }
            }
            setTimeout(() => setAnimIn(false), 220);
        }, 180);
    };

    const searchScrollSnapBy = (dir) => {
        const el = searchSnapRef.current;
        if (!el) return;
        const target = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + dir * el.clientHeight));
        animateScrollTo(el, target, 750);
    };

// Toast notifications
    const notify = (message, type = "error", ttl = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message, closing: false }]);
        const slideOutMs = 250;
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, closing: true } : t));
        }, Math.max(0, ttl - slideOutMs));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl);
    };

    return (
        <div ref={appRef} className={`app-wrapper ${darkMode ? "dark-mode" : ""}`}>
            <FluidGlassBackground darkMode={darkMode} />
            <div className="glass-container">
                {showSplash && (
                    <div className="splash-overlay">
                        <div className="splash-card">
                            <div className="splash-title">Classhelper</div>
                            <div className="splash-subtitle">Loading planner…</div>
                        </div>
                    </div>
                )}
                <div className="toast-container">
{toasts.map(t => (
                        <div key={t.id} className={`toast ${t.type} ${t.closing ? 'closing' : ''}`}>{t.message}</div>
                    ))}
                </div>
                {/* Header */}
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

                {activePage === "planner" && (
                    <div className={`planner-container page-anim ${animOut ? 'anim-out' : ''} ${animIn ? 'anim-in' : ''}`}>
                        {/* Left panel - Schedule Visualizer */}
                        <div className="left-panel">
                            <div className="panel-card-header">
                                <div className="title-with-info">
                                    <h3>Schedule Preview</h3>
                                    <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Visual summary of the currently selected schedule.</span>} />
                                    </div>
                                </div>
                            </div>
                            <div className="schedule-visual">
                                {(() => {
                                    const sched = result?.schedules?.[currentIndex];
                                    const dayNames = ['Mon','Tue','Wed','Thu','Fri'];
                                    const rangeStart = 7;
                                    const rangeEnd = 21;
                                    const totalMin = Math.max(60, (rangeEnd - rangeStart) * 60);
                                    const hours = [];
                                    for (let h = rangeStart; h <= rangeEnd; h++) hours.push(h);
                                    const labelFor = (h) => {
                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                        const d = h % 12 === 0 ? 12 : h % 12;
                                        return `${d}${ampm}`;
                                    };
                                    if (!sched) return <div className="empty-schedule muted">No schedule loaded</div>;
                                    // group meetings by day
                                    const byDay = Object.fromEntries(dayNames.map(d => [d, []]));
                                    for (const c of sched.courses || []) {
                                        const hue = hueForCourse(c);
                                        const evStyle = eventStyleForHue(hue);
                                        const meetings = extractMeetings(c);
                                        for (const m of meetings) {
                                            if (!dayNames.includes(m.day)) continue;
                                            const startClamped = Math.max(rangeStart * 60, m.start);
                                            const endClamped = Math.min(rangeEnd * 60, m.end);
                                            if (endClamped <= startClamped) continue;
                                            const topPct = ((startClamped - rangeStart * 60) / totalMin) * 100;
                                            const heightPct = ((endClamped - startClamped) / totalMin) * 100;
                                            byDay[m.day].push({ course: c, topPct, heightPct, style: evStyle, start: m.start, end: m.end });
                                        }
                                    }
                                    return (
                                        <div className="schedule-week">
                                            <div className="day-label-row">
                                                <div className="time-spacer" />
                                                {dayNames.map(d => <div key={d} className="day-label">{d}</div>)}
                                            </div>
                                            <div className="schedule-grid">
                                                <div className="time-col">
                                                    {hours.map(h => (
                                                        <div key={h} className="time-tick" style={{ top: `${((h - rangeStart) / (rangeEnd - rangeStart)) * 100}%` }}>
                                                            <span>{labelFor(h)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {dayNames.map((d) => (
                                                    <div key={d} className="day-col">
                                                        {(byDay[d] || []).sort((a,b) => a.topPct - b.topPct).map((ev, idx) => (
                                                            <div key={idx} className="event-block" style={{ top: `${ev.topPct}%`, height: `${ev.heightPct}%`, '--ev-delay': `${Math.min(idx, 8) * 60}ms`, ...ev.style }}>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Right panel - Snap scroll cards with overlay indicators */}
                        <div className="right-panel">
                            <div className="snap-container">
                                <div ref={snapScrollRef} className="snap-scroll">
                                    {/* Card 1 */}
                                    <section className="panel-card add-courses-card">
                                        <div className="panel-card-header">
                                            <div className="title-with-info">
                                                <h3>Add Courses</h3>
                                                <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Add courses manually or include filler attributes to auto-search options during generation.</span>} />
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            className="input-box"
                                            placeholder="Ex: CSE 374"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = (input || '').trim(); if (t) { addCourse(); } else { getSchedules(); } } }}
                                        />
                        <div className="btn-row" style={{ marginTop: "10px" }}>
                                            <button className="add-btn" onClick={addCourse}>Add</button>
                                            <button className={`generate-btn ${isGenerating ? 'loading' : ''}`} onClick={getSchedules} disabled={isGenerating || generateCooldown}>{isGenerating ? 'Generating…' : generateCooldown ? 'Please wait...' : 'Generate'}</button>
                                        </div>
                                        {needsRegenerate && (
                                            <div className="regen-indicator">Settings changed — regenerate to update results</div>
                                        )}

                                    <div className="subheader-with-info planner-your-courses-header">
                                        <h4>Your Courses</h4>
                                        <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Items added to your planner. Fillers are placeholders matched by attributes.</span>} />
                                        </div>
                                    </div>
                                    <div className="course-list-container">
                                        <ul className="course-list">
                                        {courses.map((course, i) => (
                                            <li key={i} className={`course-item ${course.type === 'filler' ? 'filler' : ''}`}>
                                                {course.type === 'filler' ? (
                                                    <>
                                                        <strong>Filler</strong>
                                                        <div className="info-container">
<InfoTip isDark={darkMode} content={course.attrs?.length ? (
                                                                <div className="tooltip-chip-wrap">
                                                                    {course.attrs.slice(0, 3).map((a, idx) => (
                                                                        <span key={idx} className="attr-chip">{ATTR_LABELS[a] || a}</span>
                                                                    ))}
                                                                    {course.attrs.length > 3 && (
                                                                        <span className="attr-chip counter">+{course.attrs.length - 6}</span>
                                                                    )}
                                                                </div>
                                                            ) : (<span>No attributes</span>)} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>{course.value}{course.valid === false && <span className="invalid-tag">Invalid</span>}</>
                                                )}
                                                <button className="remove-btn" onClick={() => removeCourse(i)}>
                                                    <IoClose />
                                                </button>
                                            </li>
                                        ))}
                                        </ul>
                                    </div>
                                    </section>

                                    {/* Card 2 */}
                                    <section className="panel-card">
                                        <div className="panel-card-header">
                                            <div className="title-with-info">
                                                <h3>Generated Schedules</h3>
                                                <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Browse the generated schedules one at a time using the arrows.</span>} />
                                                </div>
                                            </div>
                                            <button className="panel-back-up-inline" onClick={() => scrollSnapBy(-1)} title="Back to Add Courses">
                                                <IoChevronUp />
                                            </button>
                                        </div>
                                        {result?.schedules?.length > 0 ? (
                                            <div className="results-card">
                                                <div className="result-viewport">
                                                    <div className={`result-window ${chipsFading ? 'chips-fade' : ''}`}>
                                                        <div className="result-slider" style={{ height: `${result.schedules.length * 100}%`, transform: `translateY(-${(100 / result.schedules.length) * currentIndex}%)` }}>
                                                            {result.schedules.map((sched, idx) => (
                                                                <div key={idx} className="result-slide" style={{ height: `${100 / result.schedules.length}%` }}>
                                                                    <div className="slide-scroll">
                                                                        <div className="course-legend">
                                                                            {sched.courses.map((c, i) => (
                                                                                <div key={`legend-${i}`} className="course-row">
                                                                                    <span className="course-chip dot" style={chipStyleForHue(hueForCourse(c))} />
                                                                                    <span className="course-label">
                                                                                        {c.subject} {c.courseNum} (CRN {c.crn})
                                                                                        {(() => { const dd = parseDeliveryDays(c.delivery); return dd === 'WEB' ? <span className="legend-web"> • WEB</span> : null; })()}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        {optimizeFreeTime && <p className="free-time">Free time: {sched.freeTime}</p>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="results-nav">
                                                    <button onClick={() => navResults(-1)} disabled={currentIndex === 0}>
                                                        <IoChevronUp />
                                                    </button>
                                                    <div className="results-count">{(currentIndex + 1)} / {result.schedules.length}</div>
                                                    <button onClick={() => navResults(1)} disabled={currentIndex === result.schedules.length - 1}>
                                                        <IoChevronDown />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : <p>No results yet.</p>}
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activePage === "search" && (
                    <div className={`search-page page-anim ${animOut ? 'anim-out' : ''} ${animIn ? 'anim-in' : ''}`}>
                        <div className="snap-container">
                            <div ref={searchSnapRef} className="snap-scroll search-snap">
                                {/* Search inputs card */}
                                <section className="panel-card search-panel">
                                    <div className="search-panel-body">
                                        <div className="search-first-grid">
                                            <div className="search-col">
                                                <div className="search-subgrid">
                                                    <div className="search-subcard">
                                                        <div className="label-with-info">
                                                            <label>Search by CRN</label>
                                                            <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Enter a numeric CRN (course registration number).</span>} />
                                                            </div>
                                                        </div>
                                                        <input className="input-box input-dark" placeholder="e.g., 12384" value={crnInput} onChange={(e) => setCrnInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchByCRN(); setTimeout(() => searchScrollSnapBy(1), 0); } }} />
                                                        <div className="btn-row compact">
                                                            <button className={`generate-btn btn-small ${loading ? 'loading' : ''}`} onClick={() => { searchByCRN(); }} disabled={searchCooldown || loading}>{loading ? 'Loading...' : searchCooldown ? 'Please wait...' : 'Search CRN'}</button>
                                                        </div>
                                                    </div>
                                                    <div className="search-subcard">
                                                        <div className="label-with-info">
                                                            <label>Search by Course</label>
                                                            <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Use format like CSE 381 (subject + number).</span>} />
                                                            </div>
                                                        </div>
                                                        <input className="input-box input-dark" placeholder="e.g., CSE 381" value={courseSearchInput} onChange={(e) => setCourseSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchByInfo(); setTimeout(() => searchScrollSnapBy(1), 0); } }} />
                                                        <div className="btn-row compact">
                                                            <button className={`generate-btn btn-small ${loading ? 'loading' : ''}`} onClick={() => { searchByInfo(); }} disabled={searchCooldown || loading}>{loading ? 'Loading...' : searchCooldown ? 'Please wait...' : 'Search Course'}</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="filler-col">
                                                <div className="filler-box">
                                                    <div className="filler-left">
                                                        <div className="title-with-info">
                                                            <h4>Filler Attributes</h4>
                                                            <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Pick attributes to match filler courses during generation.</span>} />
                                                            </div>
                                                        </div>
                                                        <div className="selected-attrs">
                                                            {fillerAttrs.length ? (
                                                                <>
                                                                    {fillerAttrs.slice(0, 8).map((a) => (
                                                                        <span key={a} className="attr-chip small">{ATTR_LABELS[a] || a}</span>
                                                                    ))}
                                                                    {fillerAttrs.length > 8 && (
                                                                        <span className="attr-chip small counter">+{fillerAttrs.length - 8}</span>
                                                                    )}
                                                                </>
                                                            ) : <span className="muted">None selected</span>}
                                                        </div>
                                                        <div className="btn-row compact">
                                                            <button className="add-btn btn-small" onClick={addFillerToPlanner}>Add Filler to Planner</button>
                                                        </div>
                                                    </div>
                                                    <div className="filler-right attr-scroll small-grid">
                                                        {ATTRIBUTE_MAP.map(opt => (
                                                            <button key={opt.code} className={`choice-button small ${fillerAttrs.includes(opt.code) ? 'selected' : ''}`} onClick={() => toggleFillerAttr(opt.code)}>{opt.label}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                                {/* Results card */}
                                <section className="panel-card search-panel">
                                    <div className="panel-card-header">
                                        <h4>Results</h4>
                                        <button className="panel-back-up-inline" onClick={() => searchScrollSnapBy(-1)} title="Back to Search"><IoChevronUp /></button>
                                    </div>
                                    <div className="course-list-container">
                                        <ul className="course-list">
                                            {searchResults?.length ? searchResults.map((c, idx) => (
                                                <li key={idx} className="course-item">
                                                    {c.subject} {c.courseNum} - {c.title} (CRN {c.crn}) — {c.campus} • {c.credits}cr • {c.delivery}
                                                </li>
                                            )) : <li className="course-item">No results</li>}
                                        </ul>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {activePage === "prefs" && <div className={`prefs-panel page-anim ${animOut ? 'anim-out' : ''} ${animIn ? 'anim-in' : ''}`}>
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
                                            ref={(node) => { trackElRef.current = node; const r = props.ref; if (typeof r === 'function') { r(node); } else if (r && typeof r === 'object') { try { r.current = node; } catch {} } }}
                                            className="range-track"
                                            style={{
                                                ...props.style,
                                                background: getTrackBackground({
                                                    values: [...(trackValuesRef.current || timeRange)].sort((a,b)=>a-b),
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
                </div>}
            </div>
        </div>
    );

    async function validateCourseEntry(courseStr, idx) {
        const m = courseStr.trim().match(/^([A-Za-z]{2,4})\s+([A-Za-z0-9]+)$/);
        if (!m) {
            setCourses(prev => prev.map((c, i) => i === idx ? { ...c, valid: false } : c));
            notify(`Invalid course format: "${courseStr}". Use format like CSE 381.`, "error");
            return;
        }
        const subj = m[1].toUpperCase();
        const num = m[2];
        const campusArg = campus.includes("All") ? "" : `campus: [${campus.map(c => `"${c}"`).join(",")}]`;
        const query = `
        query {
          getCourseByInfo(
            term: "${term}"
            ${campusArg}
            subject: ["${subj}"]
            courseNum: "${num}"
          ) {
            ... on SuccessCourse { courses { crn } }
            ... on ErrorCourse { error message }
          }
        }`;
        try {
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByInfo;
            const ok = Array.isArray(node?.courses) && node.courses.length > 0;
            setCourses(prev => prev.map((c, i) => i === idx ? { ...c, valid: ok } : c));
            if (!ok) notify(`No course found for ${courseStr}`, "error");
        } catch {
            setCourses(prev => prev.map((c, i) => i === idx ? { ...c, valid: false } : c));
            notify("Validation failed. Please try again.", "error");
        }
    }
}
