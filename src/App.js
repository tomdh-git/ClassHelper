import React, { useEffect, useRef, useState } from "react";
import InfoTip from "./components/common/InfoTip";
import { Range } from "react-range";
import "./styles/index.css";
import { IoClose, IoChevronUp, IoChevronDown, IoSunny, IoMoon } from "react-icons/io5";

const BASE_URL = "https://courseapi-production-3751.up.railway.app";
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const ALIVE_URL = `${BASE_URL}/alive`;

export default function App() {
    const [page, setPage] = useState("planner");
    const [courses, setCourses] = useState([{ value: "CSE 374", valid: true }]);
    const [input, setInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
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

    const [campus, setCampus] = useState(["O"]); // allow multi-select (e.g., ["O", "M"]) or ["All"]
    const [term, setTerm] = useState("202620");
    const [optimizeFreeTime, setOptimizeFreeTime] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [timeRange, setTimeRange] = useState([8, 18]);
    const [currentIndex, setCurrentIndex] = useState(0);

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

    const getSchedules = async () => {
        setLastError(null);
        if (!(await checkAlive())) return;

        const freeTimeFields = optimizeFreeTime ? "freeTime" : "";
        const courseVals = courses
            .filter(c => c.type !== 'filler' && c.valid !== false)
            .map(c => c.value);
        const fillerAttrUnion = Array.from(new Set(
            courses.filter(c => c.type === 'filler').flatMap(c => c.attrs || [])
        ));
        const baseTimeLines = optimizeFreeTime ? `preferredStart: "${formatTimeForQuery(timeRange[0])}"
            preferredEnd: "${formatTimeForQuery(timeRange[1])}"` : "";

        const buildScheduleQuery = () => `
        query {
          getScheduleByCourses(
            courses: [${courseVals.map(c => `"${c}"`).join(",")}]
            campus: [${campus.map(c => `"${c}"`).join(",")}]
            term: "${term}"
            optimizeFreeTime: ${optimizeFreeTime}
            ${baseTimeLines}
          ) {
            ... on SuccessSchedule {
              schedules { courses { subject courseNum crn } ${freeTimeFields} }
            }
            ... on ErrorSchedule { error message }
          }
        }`;

        const buildFillerQuery = () => `
        query {
          getFillerByAttributes(
            attributes: [${fillerAttrUnion.map(a => `"${a}"`).join(",")}]
            courses: [${courseVals.map(c => `"${c}"`).join(",")}]
            campus: [${campus.map(c => `"${c}"`).join(",")}]
            term: "${term}"
            ${baseTimeLines}
          ) {
            ... on SuccessSchedule {
              schedules { courses { subject courseNum crn } ${freeTimeFields} }
            }
            ... on ErrorSchedule { error message }
          }
        }`;

        const isFillerMode = fillerAttrUnion.length > 0;
        const query = isFillerMode ? buildFillerQuery() : buildScheduleQuery();

        try {
            setLoading(true);
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            const key = fillerAttrUnion.length > 0 ? 'getFillerByAttributes' : 'getScheduleByCourses';
            setResult(data.data[key]);
            setCurrentIndex(0);
            // Auto-jump to the Generated Schedules card
            setTimeout(() => scrollSnapBy(1), 0);
        } catch {
            setLastError("Failed to fetch");
        } finally {
            setLoading(false);
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
        setLastError(null);
        if (!(await checkAlive())) return;
        const crn = parseInt(crnInput, 10);
        if (Number.isNaN(crn)) { setLastError("Enter a numeric CRN"); return; }
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
        try {
            setLoading(true);
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByCRN;
            const list = node?.courses ?? [];
            if (list.length === 0) {
                notify(node?.message || "No results found", "error");
            }
            setSearchResults(list);
        } catch {
            setLastError("Search failed");
            notify("Search failed", "error");
        } finally { setLoading(false); }
    };

    const searchByInfo = async () => {
        setLastError(null);
        if (!(await checkAlive())) return;
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
        try {
            setLoading(true);
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByInfo;
            const list = node?.courses ?? [];
            if (list.length === 0) {
                notify(node?.message || "No results found", "error");
            }
            setSearchResults(list);
        } catch {
            setLastError("Search failed");
            notify("Search failed", "error");
        } finally { setLoading(false); }
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

    const scrollSnapBy = (dir) => {
        const el = snapScrollRef.current;
        if (!el) return;
        el.scrollBy({ top: dir * el.clientHeight, behavior: 'smooth' });
    };

    // Search snap
    const searchSnapRef = useRef(null);
    const searchScrollSnapBy = (dir) => {
        const el = searchSnapRef.current;
        if (!el) return;
        el.scrollBy({ top: dir * el.clientHeight, behavior: 'smooth' });
    };

    // Toast notifications
    const [toasts, setToasts] = useState([]);
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
        <div className={`app-wrapper ${darkMode ? "dark-mode" : ""}`}>
            <div className="glass-container">
                <div className="toast-container">
{toasts.map(t => (
                        <div key={t.id} className={`toast ${t.type} ${t.closing ? 'closing' : ''}`}>{t.message}</div>
                    ))}
                </div>
                {/* Header */}
                <div className="header-bar">
                    <div className="logo-text">
                        <img src={darkMode ? "/assets/img/logo_dark.png" : "/assets/img/logo_light.png"} alt="Logo" className="app-logo" />
                        <h2>ClassHelper V2</h2>
                    </div>
                    <div className="nav-buttons">
                        <button onClick={() => setPage("planner")} className={page === "planner" ? "active" : ""}>Planner</button>
                        <button onClick={() => setPage("search")} className={page === "search" ? "active" : ""}>Search</button>
                        <button onClick={() => setPage("prefs")} className={page === "prefs" ? "active" : ""}>Preferences</button>
                        <button className="dark-btn" onClick={() => setDarkMode(!darkMode)}>
                            {darkMode ? <IoSunny /> : <IoMoon />}
                        </button>
                    </div>
                    {loading && <div className="loading-inline"><div className="loading-progress"></div></div>}
                </div>

                {page === "planner" && (
                    <div className="planner-container">
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
                                <p>Schedule visualization goes here.</p>
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
                                        />
                                        <div className="btn-row" style={{ marginTop: "10px" }}>
                                            <button className="add-btn" onClick={addCourse}>Add</button>
                                            <button className="generate-btn" onClick={getSchedules}>Generate</button>
                                        </div>

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
                                                    <div className="result-window">
                                                        <div className="result-slider" style={{ height: `${result.schedules.length * 100}%`, transform: `translateY(-${(100 / result.schedules.length) * currentIndex}%)` }}>
                                                            {result.schedules.map((sched, idx) => (
                                                                <div key={idx} className="result-slide" style={{ height: `${100 / result.schedules.length}%` }}>
                                                                    <div className="slide-scroll">
                                                                        <div className="schedule-courses">
                                                                            {sched.courses.map((c, i) => (
                                                                                <span key={i} className="course-chip">{c.subject} {c.courseNum} (CRN {c.crn})</span>
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
                                                    <button onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))} disabled={currentIndex === 0}>
                                                        <IoChevronUp />
                                                    </button>
                                                    <button onClick={() => setCurrentIndex(i => Math.min(i + 1, result.schedules.length - 1))} disabled={currentIndex === result.schedules.length - 1}>
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

                {page === "search" && (
                    <div className="search-page">
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
                                                        <input className="input-box input-dark" placeholder="e.g., 12384" value={crnInput} onChange={(e) => setCrnInput(e.target.value)} />
                                                        <div className="btn-row compact">
                                                            <button className="generate-btn btn-small" onClick={() => { searchByCRN(); setTimeout(() => searchScrollSnapBy(1), 0); }}>Search CRN</button>
                                                        </div>
                                                    </div>
                                                    <div className="search-subcard">
                                                        <div className="label-with-info">
                                                            <label>Search by Course</label>
                                                            <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Use format like CSE 381 (subject + number).</span>} />
                                                            </div>
                                                        </div>
                                                        <input className="input-box input-dark" placeholder="e.g., CSE 381" value={courseSearchInput} onChange={(e) => setCourseSearchInput(e.target.value)} />
                                                        <div className="btn-row compact">
                                                            <button className="generate-btn btn-small" onClick={() => { searchByInfo(); setTimeout(() => searchScrollSnapBy(1), 0); }}>Search Course</button>
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
                
                {page === "prefs" && <div className="prefs-panel">
                    <div className="panel prefs-panel">
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
                                Term
                                <div className="info-container">
<InfoTip isDark={darkMode} content={<span>Choose a single academic term.</span>} />
                                </div>
                            </span>
                            <div className="choice-group single">
                                {[
                                    { label: "Spring 2026", code: "202620" },
                                    { label: "Fall 2025", code: "202610" }
                                ].map((opt) => (
                                    <button
                                        key={opt.code}
                                        className={`choice-button ${term === opt.code ? 'selected' : ''}`}
                                        onClick={() => setTerm(opt.code)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
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
                                    onChange={(values) => setTimeRange(values)}
                                    renderTrack={({ props, children }) => (
                                        <div {...props} className="range-track">{children}</div>
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
