import React, { useState } from "react";

const BASE_URL = "https://courseapi-production-3751.up.railway.app";
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const ALIVE_URL = `${BASE_URL}/alive`;

export default function App() {
    const [courses, setCourses] = useState(["CSE 374"]);
    const [input, setInput] = useState("");
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState("Idle");
    const [lastError, setLastError] = useState(null);

    const log = (msg) => setStatus(msg);

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
            log("Checking service...");
            const res = await fetch(ALIVE_URL);
            if (!res.ok) throw new Error("Service responded but not OK");
            log("Service online ✅");
            return true;
        } catch {
            setLastError("Service is unreachable");
            log("Service offline ❌");
            return false;
        }
    };

    const getSchedules = async () => {
        setLastError(null);
        if (!(await checkAlive())) return;

        const query = `
      query {
        getScheduleByCourses(
          courses: [${courses.map((c) => `"${c}"`).join(",")}]
          campus: ["O"]
          term: "202620"
          optimizeFreeTime: true
          preferredStart: "10:00am"
          preferredEnd: "4:30pm"
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
            log("Fetching schedule...");
            const res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            setResult(data.data.getScheduleByCourses);
            log("Done ✅");
        } catch {
            log("Fetch failed");
            setLastError("Failed to fetch");
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Schedule Planner</h2>

            <div style={styles.topRow}>
                {/* Left: input + buttons + status */}
                <div style={styles.leftPanel}>
                    <input
                        style={styles.input}
                        type="text"
                        placeholder="CSE 374"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button style={styles.generateBtn} onClick={addCourse}>Add Course</button>
                    <button style={styles.generateMain} onClick={getSchedules}>Generate</button>

                    {/* ✅ STATUS under generate button */}
                    <div style={styles.statusText}>{status}</div>
                    {lastError && <div style={{ color: "red", fontSize: "0.8rem" }}>{lastError}</div>}
                </div>

                {/* Right: Course List */}
                <div style={styles.coursePanel}>
                    <h4>Courses</h4>
                    <ul style={styles.courseList}>
                        {courses.map((course, i) => (
                            <li key={i} style={styles.courseItem}>
                                {course}
                                <button style={styles.removeBtn} onClick={() => removeCourse(i)}>✕</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Results Panel */}
            <div style={styles.resultsPanel}>
                {result ? (
                    "schedules" in result ? (
                        result.schedules.map((sched, idx) => (
                            <div key={idx} style={styles.card}>
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
                        <div style={{ color: "red" }}>{result.error}: {result.message}</div>
                    )
                ) : (
                    <p style={{ color: "#666" }}>Results will appear here.</p>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { padding: 20, maxWidth: 900, margin: "auto" },
    title: { fontWeight: 600, fontSize: "1.6rem", marginBottom: 15 },

    topRow: {
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
        height: "200px",
    },

    leftPanel: {
        width: "200px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },

    input: {
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #ccc",
    },

    generateBtn: {
        padding: "6px 10px",
        borderRadius: 8,
        border: "none",
        background: "#3498db",
        color: "white",
        cursor: "pointer",
    },

    generateMain: {
        padding: "6px 10px",
        borderRadius: 8,
        border: "none",
        background: "#2ecc71",
        color: "white",
        cursor: "pointer",
    },

    statusText: {
        marginTop: 5,
        fontSize: "0.85rem",
        color: "#555",
        minHeight: "18px",
    },

    coursePanel: {
        flex: 1,
        background: "#fff",
        padding: 10,
        borderRadius: 12,
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        height: "200px",
        overflowY: "auto",
    },

    courseList: { listStyle: "none", padding: 0, margin: 0 },

    courseItem: {
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 8px",
        borderRadius: 6,
        background: "#f8f9fa",
        marginBottom: 5,
    },

    removeBtn: {
        border: "none",
        background: "transparent",
        color: "#e63946",
        cursor: "pointer",
    },

    resultsPanel: {
        marginTop: 20,
        height: "300px",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        padding: 15,
    },

    card: {
        background: "#fdfdfd",
        padding: 10,
        marginBottom: 10,
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
};
