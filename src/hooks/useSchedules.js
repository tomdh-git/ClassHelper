import { useState, useRef } from "react";
import { GRAPHQL_URL, checkAlive, toGqlStringArray } from "../utils/api";
import { formatTimeForQuery } from "../utils/timeUtils";
import { hashHue, courseKey } from "../utils/colorUtils";

export function useSchedules(
    courses,
    campus,
    term,
    optimizeFreeTime,
    timeRange,
    delivery,
    fillerAttrs,
    notify,
    baselinePrefsRef,
    snapshotPrefs
) {
    const [result, setResult] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateCooldown, setGenerateCooldown] = useState(false);
    const generateCooldownRef = useRef(false);
    const generateCooldownTimeoutRef = useRef(null);
    const [needsRegenerate, setNeedsRegenerate] = useState(false);
    const [courseHues, setCourseHues] = useState({});
    const [currentIndex, setCurrentIndex] = useState(0);

    const getSchedules = async (setLoading, setLastError, scrollSnapBy) => {
        // Check cooldown
        if (generateCooldownRef.current) return;

        setLastError(null);
        if (!(await checkAlive(setLoading, setLastError))) return;

        // Clear any existing timeout
        if (generateCooldownTimeoutRef.current) {
            clearTimeout(generateCooldownTimeoutRef.current);
        }

        // Set cooldown
        generateCooldownRef.current = true;
        setGenerateCooldown(true);

        const freeTimeFields = optimizeFreeTime ? "freeTime" : "";
        const courseVals = courses
            .filter(c => c.type !== 'filler' && c.valid !== false)
            .map(c => c.value);
        const fillerAttrUnion = Array.from(new Set(
            courses.filter(c => c.type === 'filler').flatMap(c => c.attrs || [])
        ));
        const baseTimeLines = optimizeFreeTime ? `preferredStart: "${formatTimeForQuery(timeRange[0])}"\r
            preferredEnd: "${formatTimeForQuery(timeRange[1])}"` : "";

        const buildScheduleQuery = () => `
        query {
          getScheduleByCourses(input:{
            courses: ${toGqlStringArray(courseVals)}
            campus: ${toGqlStringArray(campus)}
            term: "${term}"\r
            optimizeFreeTime: ${optimizeFreeTime}
            ${baseTimeLines}
            delivery: ${toGqlStringArray(delivery)}
          }) {
            ... on SuccessSchedule {
              schedules { courses { subject courseNum crn delivery } ${freeTimeFields} }
            }
            ... on ErrorSchedule { error message }
          }
        }`;

        const buildFillerQuery = () => `
        query {
          getFillerByAttributes(input:{
            attributes: ${toGqlStringArray(fillerAttrUnion)}
            courses: ${toGqlStringArray(courseVals)}
            campus: ${toGqlStringArray(campus)}
            term: "${term}"\r
            ${baseTimeLines}
            delivery: ${toGqlStringArray(delivery)}
          }) {
            ... on SuccessSchedule {
              schedules { courses { subject courseNum crn delivery } ${freeTimeFields} }
            }
            ... on ErrorSchedule { error message }
          }
        }`;

        const isFillerMode = fillerAttrUnion.length > 0;
        const query = isFillerMode ? buildFillerQuery() : buildScheduleQuery();
        console.log(query);

        // Helpers to process large result sets
        const schedKey = (s) => {
            try {
                const crns = (s?.courses || []).map(c => String(c?.crn ?? '')).filter(Boolean).sort();
                return crns.join('_');
            } catch { return ''; }
        };
        const dedupeSchedules = (arr = []) => {
            const seen = new Set();
            const out = [];
            for (const s of arr) {
                const k = schedKey(s);
                if (!seen.has(k)) { seen.add(k); out.push(s); }
            }
            return out;
        };

        let schedulesProc;
        try {
            setLoading(true);
            setIsGenerating(true);
            setNeedsRegenerate(false);
            // First attempt: renderer fetch
            let res = await fetch(GRAPHQL_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });
            let rawText = await res.text();
            let data = null;
            try { data = JSON.parse(rawText); } catch { data = { parseError: true, raw: rawText }; }
            const key = fillerAttrUnion.length > 0 ? 'getFillerByAttributes' : 'getScheduleByCourses';
            let node = data?.data?.[key] || null;
            schedulesProc = Array.isArray(node?.schedules) ? node.schedules : [];

            // If HTTP not ok or union is error or 0 schedules, try main-process fetch fallback (Electron only)
            const shouldFallback = !res.ok || (node && node.error) || schedulesProc.length === 0;
            if (shouldFallback && window.electronAPI?.graphql) {
                const mres = await window.electronAPI.graphql(query, GRAPHQL_URL);
                if (mres?.data) {
                    data = mres.data;
                    node = data?.data?.[key] || null;
                    schedulesProc = Array.isArray(node?.schedules) ? node.schedules : [];
                }
            }

            if (schedulesProc.length > 30) {
                const deduped = dedupeSchedules(schedulesProc);
                schedulesProc = deduped.length > 10 ? deduped.slice(0, 10) : deduped;
            }
            const nodeOut = node ? { ...node, schedules: schedulesProc } : node;
            setResult(nodeOut);
            setCurrentIndex(0);

            if (!Array.isArray(schedulesProc) || schedulesProc.length === 0) {
                if (isFillerMode) {
                    notify("Failed to find fillers. Try different attributes.", 'error', 6000);
                } else {
                    const msg = node?.message || (Array.isArray(data?.errors) ? data.errors.map(e => e.message).join('; ') : 'No schedules returned');
                    notify(`Generate: ${msg}`, 'error', 6000);
                }
            }
            // Update baseline to current prefs on successful generate
            baselinePrefsRef.current = { ...snapshotPrefs() };
            // Assign hues for courses across processed schedules for stable colors
            try {
                const allCourses = (schedulesProc || []).flatMap(s => s.courses || []);
                setCourseHues(prev => {
                    const next = { ...prev };
                    for (const c of allCourses) {
                        const k = courseKey(c);
                        if (!(k in next)) next[k] = hashHue(k);
                    }
                    return next;
                });
            } catch { }
            // Auto-jump to the Generated Schedules card (slightly delayed for smoother layout)
            setTimeout(() => scrollSnapBy(1), 140);
        } catch (e) {
            setLastError("Failed to fetch");
            if (isFillerMode) {
                notify("Failed to find fillers. Try different attributes.", 'error', 6000);
            } else {
                notify(`Generate error: ${String((e && e.message) || e)}`, 'error', 6000);
            }
        } finally {
            setLoading(false);
            setIsGenerating(false);

            // Clear any existing timeout
            if (generateCooldownTimeoutRef.current) {
                clearTimeout(generateCooldownTimeoutRef.current);
            }

            // Check if we got results (use schedulesProc from the try block scope)
            const hasResults = schedulesProc && schedulesProc.length > 0;

            if (hasResults) {
                // Clear cooldown immediately if results returned
                generateCooldownRef.current = false;
                setGenerateCooldown(false);
            } else {
                // Reset cooldown after 8 seconds if no results
                generateCooldownTimeoutRef.current = setTimeout(() => {
                    generateCooldownRef.current = false;
                    setGenerateCooldown(false);
                }, 8000);
            }
        }
    };

    return {
        result, setResult,
        isGenerating,
        generateCooldown,
        needsRegenerate, setNeedsRegenerate,
        courseHues,
        currentIndex, setCurrentIndex,
        getSchedules
    };
}
