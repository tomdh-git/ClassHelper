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

        const query = `
        query {
          getScheduleByCourses(
            courses: [${courses.map((c) => `"${c}"`).join(",")}]
            campus: ["${campus}"]
            term: "${term}"
            optimizeFreeTime: ${optimizeFreeTime}
            preferredStart: "${formatTimeForQuery(timeRange[0])}"
            preferredEnd: "${formatTimeForQuery(timeRange[1])}"
          ) {
            ... on SuccessSchedule {
              schedules {
                courses { subject courseNum crn }
                freeTime
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

            {/* Centered Top Navigation Buttons */}
            <div className="nav-buttons-centered">
                <button onClick={() => setPage("planner")} className={`btn nav-btn ${page === "planner" ? "active" : ""}`}>Planner</button>
                <button onClick={() => setPage("search")} className={`btn nav-btn ${page === "search" ? "active" : ""}`}>Search</button>
                <button onClick={() => setPage("prefs")} className={`btn nav-btn ${page === "prefs" ? "active" : ""}`}>Preferences</button>
            </div>

            {page === "planner" && (
                <>
                    <div className="planner-row">
                        {/* Add Course Panel */}
                        <div className="panel add-course-panel">
                            <input
                                className="input-box"
                                type="text"
                                placeholder="Ex: CSE 374, SLM 150C"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button className="btn add-btn" onClick={addCourse}>Add</button>
                            <button className="btn generate-btn" onClick={getSchedules}>Generate</button>

                            {loading && <div className="loading-bar"><div className="loading-progress" /></div>}
                            {!loading && <div className="status-text">{lastError}</div>}
                        </div>

                        {/* Course List Panel */}
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

                    {/* Results Below */}
                    <div className="results-panel">
                        {result ? (
                            "schedules" in result ? (
                                result.schedules.map((sched, idx) => (
                                    <div key={idx} className="result-card">
                                        <b>Courses:</b>
                                        <ul>
                                            {sched.courses.map((c, i) => (
                                                <li key={i}>{c.subject} {c.courseNum} — CRN {c.crn}</li>
                                            ))}
                                        </ul>
                                        <b>Free Time:</b> {sched.freeTime}
                                    </div>
                                ))
                            ) : (
                                <div className="error-text">{result.error}: {result.message}</div>
                            )
                        ) : (
                            <p className="placeholder-text">Results will appear here.</p>
                        )}
                    </div>
                </>
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
                        <span>Campus:</span>
                        <select value={campus} onChange={(e) => setCampus(e.target.value)}>
                            <option value="O">Oxford</option>
                            <option value="M">Hamilton</option>
                            <option value="L">Luxembourg</option>
                            <option value="All">All</option>
                        </select>
                    </div>

                    <div className="prefs-row">
                        <span>Term:</span>
                        <select value={term} onChange={(e) => setTerm(e.target.value)}>
                            <option value="202620">Spring 2026</option>
                            <option value="202610">Fall 2025</option>
                        </select>
                    </div>

                    <div className="switch-container">
                        <span>Optimize Free Time</span>
                        <label className="switch">
                            <input type="checkbox" checked={optimizeFreeTime} onChange={() => setOptimizeFreeTime(!optimizeFreeTime)} />
                            <span className="slider round" />
                        </label>
                    </div>

                    <div className="switch-container">
                        <span>Dark Mode</span>
                        <label className="switch">
                            <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                            <span className="slider round" />
                        </label>
                    </div>

                    <div className="time-label">Preferred Time: {formatTime(timeRange[0])} - {formatTime(timeRange[1])}</div>
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
            )}
        </div>
    );
}
