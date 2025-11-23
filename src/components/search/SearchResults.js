import React from "react";
import { IoChevronUp } from "react-icons/io5";

export default function SearchResults({ searchResults, searchScrollSnapBy }) {
    return (
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
    );
}
