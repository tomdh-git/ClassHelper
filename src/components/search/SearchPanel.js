import React from "react";
import InfoTip from "../common/InfoTip";

export default function SearchPanel({
    crnInput, setCrnInput, searchByCRN, loading, searchCooldown,
    courseSearchInput, setCourseSearchInput, searchByInfo,
    fillerAttrs, setFillerAttrs, setCourses, notify,
    darkMode, ATTR_LABELS, ATTRIBUTE_MAP, searchScrollSnapBy
}) {
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

    return (
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
    );
}
