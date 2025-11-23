import React, { useState, useRef, useEffect } from "react";
import "./styles/index.css";
import FluidGlassBackground from "./components/FluidGlassBackground";

// Hooks
import { usePreferences } from "./hooks/usePreferences";
import { useCourses } from "./hooks/useCourses";
import { useSchedules } from "./hooks/useSchedules";
import { useSearch } from "./hooks/useSearch";
import { useTheme } from "./hooks/useTheme";

// Components
import Header from "./components/common/Header";
import ToastContainer from "./components/common/ToastContainer";
import ScheduleVisualizer from "./components/planner/ScheduleVisualizer";
import AddCoursesCard from "./components/planner/AddCoursesCard";
import GeneratedSchedulesCard from "./components/planner/GeneratedSchedulesCard";
import SearchPanel from "./components/search/SearchPanel";
import SearchResults from "./components/search/SearchResults";
import PreferencesPanel from "./components/preferences/PreferencesPanel";

export default function App() {
    // Toasts
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

    // Hooks
    const {
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
    } = usePreferences();

    const { appRef, toggleTheme } = useTheme(darkMode, setDarkMode);

    const {
        input, setInput,
        addCourse,
        removeCourse
    } = useCourses(courses, setCourses, campus, term, notify);

    const {
        result, setResult,
        isGenerating,
        generateCooldown,
        needsRegenerate, setNeedsRegenerate,
        courseHues,
        currentIndex, setCurrentIndex,
        getSchedules
    } = useSchedules(courses, campus, term, optimizeFreeTime, timeRange, delivery, fillerAttrs, notify, baselinePrefsRef, () => ({ campus, term, optimizeFreeTime, timeRange }));

    const {
        crnInput, setCrnInput,
        courseSearchInput, setCourseSearchInput,
        searchResults, setSearchResults,
        searchCooldown,
        searchByCRN,
        searchByInfo
    } = useSearch(term, campus, notify);

    // Loading state for search/generate buttons (shared or specific?)
    // In the original code, `loading` was shared. Here we can pass local setters or manage it in hooks.
    // The hooks manage their own async state but we need to pass `loading` status to buttons.
    // Actually, `useSchedules` has `isGenerating`. `useSearch` has `searchCooldown` but not explicit loading state exposed yet.
    // Let's add a local loading state for search if needed, or update useSearch to expose it.
    // For now, I'll add a simple loading state here if the hooks don't fully cover it, 
    // BUT `useSearch` in my implementation didn't expose `loading`. I should probably update `useSearch` or just pass a local setter.
    // Let's use a local loading state for search operations to keep it simple as the hooks expect `setLoading`.
    const [searchLoading, setSearchLoading] = useState(false);
    const [lastError, setLastError] = useState(null); // Shared error state if needed

    // Splash screen
    const [showSplash, setShowSplash] = useState(true);
    useEffect(() => {
        const id = setTimeout(() => setShowSplash(false), 450);
        return () => clearTimeout(id);
    }, []);

    // Page transition logic
    const [animOut, setAnimOut] = useState(false);
    const [animIn, setAnimIn] = useState(false);
    const snapScrollRef = useRef(null);
    const searchSnapRef = useRef(null);

    // Smooth scroll helper
    const animateScrollTo = (el, to, duration = 750) => {
        if (!el) return;
        const start = el.scrollTop;
        const change = to - start;
        const startTime = performance.now();
        const easeInOutQuint = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
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

    const searchScrollSnapBy = (dir) => {
        const el = searchSnapRef.current;
        if (!el) return;
        const target = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + dir * el.clientHeight));
        animateScrollTo(el, target, 750);
    };

    const startPageTransition = (target) => {
        if (target === activePage || animOut || animIn) return;
        const plannerChanged = target === 'planner' && prefsChangedFromBaseline();
        setAnimOut(true);
        setTimeout(() => {
            setActivePage(target);
            setAnimOut(false);
            setAnimIn(true);
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

    // Constants
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
                <ToastContainer toasts={toasts} />
                <Header
                    activePage={activePage}
                    startPageTransition={startPageTransition}
                    darkMode={darkMode}
                    toggleTheme={toggleTheme}
                />

                {activePage === "planner" && (
                    <div className={`planner-container page-anim ${animOut ? 'anim-out' : ''} ${animIn ? 'anim-in' : ''}`}>
                        <ScheduleVisualizer
                            result={result}
                            currentIndex={currentIndex}
                            darkMode={darkMode}
                            courseHues={courseHues}
                        />
                        <div className="right-panel">
                            <div className="snap-container">
                                <div ref={snapScrollRef} className="snap-scroll">
                                    <AddCoursesCard
                                        input={input}
                                        setInput={setInput}
                                        addCourse={addCourse}
                                        getSchedules={() => getSchedules(setSearchLoading, setLastError, scrollSnapBy)}
                                        isGenerating={isGenerating}
                                        generateCooldown={generateCooldown}
                                        needsRegenerate={needsRegenerate}
                                        courses={courses}
                                        removeCourse={removeCourse}
                                        darkMode={darkMode}
                                        ATTR_LABELS={ATTR_LABELS}
                                    />
                                    <GeneratedSchedulesCard
                                        result={result}
                                        currentIndex={currentIndex}
                                        setCurrentIndex={setCurrentIndex}
                                        scrollSnapBy={scrollSnapBy}
                                        darkMode={darkMode}
                                        optimizeFreeTime={optimizeFreeTime}
                                        courseHues={courseHues}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activePage === "search" && (
                    <div className={`search-page page-anim ${animOut ? 'anim-out' : ''} ${animIn ? 'anim-in' : ''}`}>
                        <div className="snap-container">
                            <div ref={searchSnapRef} className="snap-scroll search-snap">
                                <SearchPanel
                                    crnInput={crnInput}
                                    setCrnInput={setCrnInput}
                                    searchByCRN={() => searchByCRN(setSearchLoading, setLastError, searchScrollSnapBy)}
                                    loading={searchLoading}
                                    searchCooldown={searchCooldown}
                                    courseSearchInput={courseSearchInput}
                                    setCourseSearchInput={setCourseSearchInput}
                                    searchByInfo={() => searchByInfo(setSearchLoading, setLastError, searchScrollSnapBy)}
                                    fillerAttrs={fillerAttrs}
                                    setFillerAttrs={setFillerAttrs}
                                    setCourses={setCourses}
                                    notify={notify}
                                    darkMode={darkMode}
                                    ATTR_LABELS={ATTR_LABELS}
                                    ATTRIBUTE_MAP={ATTRIBUTE_MAP}
                                    searchScrollSnapBy={searchScrollSnapBy}
                                />
                                <SearchResults
                                    searchResults={searchResults}
                                    searchScrollSnapBy={searchScrollSnapBy}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activePage === "prefs" && (
                    <PreferencesPanel
                        campus={campus} setCampus={setCampus}
                        delivery={delivery} setDelivery={setDelivery}
                        term={term} setTerm={setTerm}
                        optimizeFreeTime={optimizeFreeTime} setOptimizeFreeTime={setOptimizeFreeTime}
                        darkMode={darkMode} setDarkMode={setDarkMode}
                        timeRange={timeRange} setTimeRange={setTimeRange}
                        animOut={animOut} animIn={animIn}
                    />
                )}
            </div>
        </div>
    );
}
