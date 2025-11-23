import { useState } from "react";
import { GRAPHQL_URL } from "../utils/api";

export function useCourses(courses, setCourses, campus, term, notify) {
    const [input, setInput] = useState("");

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

    const removeCourse = (i) => setCourses(courses.filter((_, idx) => idx !== i));

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

    return {
        input, setInput,
        addCourse,
        removeCourse
    };
}
