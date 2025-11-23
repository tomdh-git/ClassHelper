import React from "react";
import InfoTip from "../common/InfoTip";
import { IoClose } from "react-icons/io5";

export default function AddCoursesCard({
    input, setInput, addCourse, getSchedules, isGenerating, generateCooldown,
    needsRegenerate, courses, removeCourse, darkMode, ATTR_LABELS
}) {
    return (
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
    );
}
