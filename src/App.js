import React, { useState } from "react";
import { Range } from "react-range";
import "./App.css";

const BASE_URL = "https://courseapi-production-3751.up.railway.app";
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const ALIVE_URL = `${BASE_URL}/alive`;

export default function App() {
    const [page, setPage] = useState("planner");
    const [courses, setCourses] = useState(["CSE 374"]);
    const [input, setInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastError, setLastError] = useState(null);

    const [campus, setCampus] = useState("O");
    const [term, setTerm] = useState("202620");
    const [optimizeFreeTime, setOptimizeFreeTime] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [timeRange, setTimeRange] = useState([8, 18]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const formatTimeForQuery = (val) => {
        const hour = Math.floor(val);
        const min = val % 1 === 0.5 ? "30" : "00";
        const ampm = hour >= 12 ? "pm" : "am";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${displayHour}:${min}${ampm}`;
    };

    const addCourse = () => {
        const trimmed = input.trim();
        if (trimmed && !courses.includes(trimmed)) {
            setCourses([...courses, trimmed]);
            setInput("");
        }
    };

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

        const query = `
        query {
          getScheduleByCourses(
            courses: [${courses.map((c) => `"${c}"`).join(",")}]
            campus: ["${campus}"]
            term: "${term}"
            optimizeFreeTime: ${optimizeFreeTime}
            ${optimizeFreeTime ? `preferredStart: "${formatTimeForQuery(timeRange[0])}"` : ""}
            ${optimizeFreeTime ? `preferredEnd: "${formatTimeForQuery(timeRange[1])}"` : ""}
          ) {
            ... on SuccessSchedule {
              schedules {
                courses { subject courseNum crn }
                ${freeTimeFields}
              }
            }
            ... on ErrorSchedule {
              error
              message
            }
          }
        }
      `;
        try {
            setLoading(true);
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            setResult(data.data.getScheduleByCourses);
            setCurrentIndex(0);
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

    return (
        <div className={`app-container ${darkMode ? "dark-mode" : ""}`}>
            <h2 className="app-title">ClassHelper V2</h2>

            <div className="nav-buttons-centered">
                <button onClick={() => setPage("planner")} className={`btn nav-btn ${page === "planner" ? "active" : ""}`}>Planner</button>
                <button onClick={() => setPage("search")} className={`btn nav-btn ${page === "search" ? "active" : ""}`}>Search</button>
                <button onClick={() => setPage("prefs")} className={`btn nav-btn ${page === "prefs" ? "active" : ""}`}>Preferences</button>
            </div>

            {page === "planner" && (
                <div className="planner-split">
                    {/* Add course */}
                    <div className="planner-left">
                        <div className="planner-row">
                            <div className="panel add-course-panel">
                                <div className="add-course-label">
                                    <span>Add Course</span>
                                    <div className="info-container">
                                    <button className="info-btn">i
                                        <div className="info-tooltip">
                                            Type in the course code (e.g., CSE 374) and click "Add" to include it in your planner.
                                        </div>
                                    </button>
                                    </div>
                                </div>
                                <input
                                    className="input-box"
                                    type="text"
                                    placeholder="Ex: CSE 374"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button className="btn add-btn" onClick={addCourse}>Add</button>
                                <button className="btn generate-btn" onClick={getSchedules}>Generate</button>
                                {loading && <div className="loading-bar"><div className="loading-progress" /></div>}
                                {!loading && <div className="status-text">{lastError}</div>}
                            </div>

                            <div className="panel course-panel">
                                <h4>Courses</h4>
                                <ul className="course-list">
                                    {courses.map((course, i) => (
                                        <li key={i} className="course-item">
                                            {course}
                                            <button className="remove-btn" onClick={() => removeCourse(i)}>✕</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="results-panel">
                            {result && "schedules" in result && result.schedules.length > 0 ? (
                                <div className="schedule-panel">
                                    <button
                                        className={`arrow-btn top ${currentIndex === 0 ? "disabled" : ""}`}
                                        onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                                    >
                                        ↑
                                    </button>

                                    <div className="schedule-card-container">
                                        {result.schedules.map((sched, idx) => (
                                            <div
                                                key={idx}
                                                className={`result-card ${idx === currentIndex ? "active" : ""} ${idx < currentIndex ? "slide-out-up" : ""} ${idx > currentIndex ? "slide-in-down" : ""}`}
                                            >
                                                <b>Courses:</b>
                                                <ul>
                                                    {sched.courses.map((c, i) => (
                                                        <li key={i}>{c.subject} {c.courseNum} — CRN {c.crn}</li>
                                                    ))}
                                                </ul>
                                                {optimizeFreeTime && <><b>Free Time:</b> {sched.freeTime}</>}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className={`arrow-btn bottom ${currentIndex === result.schedules.length - 1 ? "disabled" : ""}`}
                                        onClick={() =>
                                            setCurrentIndex((i) => Math.min(i + 1, result.schedules.length - 1))
                                        }
                                    >
                                        ↓
                                    </button>
                                </div>
                            ) : (
                                <p className="placeholder-text">Results will appear here.</p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE (Schedule Visualization Panel) */}
                    <div className="planner-right panel schedule-panel">
                        <h4>Schedule Visualization</h4>
                        <div className="schedule-placeholder">
                            {/* This is where you'll eventually render the schedule */}
                            <p>Schedule will appear here.</p>
                        </div>
                    </div>
                </div>
            )}

            {page === "search" && (
                <div className="empty-page">
                    <h3>Search Course</h3>
                    <p>Coming soon...</p>
                </div>
            )}

            {page === "prefs" && (
                <div className="panel prefs-panel">
                    <h4>Preferences</h4>
                    <div className="prefs-row">
                        <span>
                        Campus
                            <div className="info-container">
                        <button className="info-btn">i
                          <div className="info-tooltip">
                            Select which campus to filter courses from. Options include Oxford, Hamilton, Luxembourg, or All campuses.
                          </div>
                        </button>
                                </div>
                        </span>
                        <select value={campus} onChange={(e) => setCampus(e.target.value)}>
                            <option value="O">Oxford</option>
                            <option value="M">Hamilton</option>
                            <option value="L">Luxembourg</option>
                            <option value="All">All</option>
                        </select>
                    </div>

                    <div className="prefs-row">
                        <span>
                        Term
                            <div className="info-container">
                        <button className="info-btn">i
                          <div className="info-tooltip">
                            Choose the academic term (e.g., Spring 2026)
                          </div>
                        </button>
                                </div>
                        </span>
                        <select value={term} onChange={(e) => setTerm(e.target.value)}>
                            <option value="202620">Spring 2026</option>
                            <option value="202610">Fall 2025</option>
                        </select>
                    </div>

                    <div className="switch-container">
                        <span>
                        Optimize Free Time
                            <div className="info-container">
                        <button className="info-btn">i
                          <div className="info-tooltip">
                            Attempt to schedule classes with larger gaps in between to give you more free time during the day.
                          </div>
                        </button>
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
                        <button className="info-btn">i
                          <div className="info-tooltip">
                            Toggle dark mode for the app
                          </div>
                        </button>
                                </div>
                      </span>
                        <label className="switch">
                            <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                            <span className="slider round" />
                        </label>
                    </div>

                    {(
                        <div className="prefs-row prefs-time-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div className="prefs-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>Preferred Time: {formatTime(timeRange[0])} - {formatTime(timeRange[1])}</span>
                                <div className="info-container">
                                    <button className="info-btn">i
                                        <div className="info-tooltip">
                                            Set the earliest and latest times you prefer your classes to be scheduled.
                                        </div>
                                    </button>
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
                    )}

                </div>
            )}
        </div>
    );
}
