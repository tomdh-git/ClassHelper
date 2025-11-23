import React from "react";
import InfoTip from "../common/InfoTip";
import { hueForCourse, eventStyleForHue } from "../../utils/colorUtils";
import { extractMeetings } from "../../utils/scheduleUtils";

export default function ScheduleVisualizer({ result, currentIndex, darkMode, courseHues }) {
    return (
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
                    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
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
                        const hue = hueForCourse(c, courseHues);
                        const evStyle = eventStyleForHue(hue, darkMode);
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
                                        {(byDay[d] || []).sort((a, b) => a.topPct - b.topPct).map((ev, idx) => (
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
    );
}
