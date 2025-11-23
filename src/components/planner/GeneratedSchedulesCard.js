import React, { useState, useRef } from "react";
import InfoTip from "../common/InfoTip";
import { IoChevronUp, IoChevronDown } from "react-icons/io5";
import { hueForCourse, chipStyleForHue, parseDeliveryDays } from "../../utils/colorUtils";

export default function GeneratedSchedulesCard({
    result, currentIndex, setCurrentIndex, scrollSnapBy, darkMode, optimizeFreeTime, courseHues
}) {
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

    return (
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
                                                        <span className="course-chip dot" style={chipStyleForHue(hueForCourse(c, courseHues), darkMode)} />
                                                        <span className="course-label">
                                                            {c.subject} {c.courseNum} (CRN {c.crn})
                                                            {(() => { const dd = c.delivery === 'WEB' ? 'WEB' : null; return dd === 'WEB' ? <span className="legend-web"> • WEB</span> : null; })()}
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
    );
}
