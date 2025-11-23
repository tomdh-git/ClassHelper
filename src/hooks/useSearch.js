import { useState, useRef } from "react";
import { GRAPHQL_URL, checkAlive } from "../utils/api";

export function useSearch(term, campus, notify) {
    const [crnInput, setCrnInput] = useState("");
    const [courseSearchInput, setCourseSearchInput] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchCooldown, setSearchCooldown] = useState(false);
    const searchCooldownRef = useRef(false);
    const searchCooldownTimeoutRef = useRef(null);

    const buildCampusArg = () => {
        const filtered = campus.includes("All") ? [] : campus;
        return filtered.length ? `campus: [${filtered.map(c => `"${c}"`).join(",")}]` : "";
    };

    const searchByCRN = async (setLoading, setLastError, searchScrollSnapBy) => {
        // Check cooldown
        if (searchCooldownRef.current) return;

        setLastError(null);
        if (!(await checkAlive(setLoading, setLastError))) return;

        // Clear any existing timeout
        if (searchCooldownTimeoutRef.current) {
            clearTimeout(searchCooldownTimeoutRef.current);
        }

        // Set cooldown
        searchCooldownRef.current = true;
        setSearchCooldown(true);
        const crn = parseInt(crnInput, 10);
        if (Number.isNaN(crn)) {
            // Clear cooldown if validation fails
            searchCooldownRef.current = false;
            setSearchCooldown(false);
            setLastError("Enter a numeric CRN");
            return;
        }
        const query = `
        query {
          getCourseByCRN(input:{
            crn: ${crn}
            term: "${term}"
          }) {
            ... on SuccessCourse {
              courses { subject courseNum title section crn campus credits capacity requests delivery }
            }
            ... on ErrorCourse { error message }
          }
        }`;
        let list = [];
        try {
            setLoading(true);
            setSearchResults([]); // Clear previous results while loading
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByCRN;
            list = node?.courses ?? [];
            if (list.length === 0) {
                notify(node?.message || "No results found", "error");
            }
            setSearchResults(list);
        } catch {
            setLastError("Search failed");
            notify("Search failed", "error");
        } finally {
            setLoading(false);

            // Clear any existing timeout
            if (searchCooldownTimeoutRef.current) {
                clearTimeout(searchCooldownTimeoutRef.current);
            }

            // Clear cooldown immediately if results returned, otherwise after 2 seconds
            if (list.length > 0) {
                searchCooldownRef.current = false;
                setSearchCooldown(false);
                // Scroll to results card
                setTimeout(() => searchScrollSnapBy(1), 100);
            } else {
                // Reset cooldown after 2 seconds if no results
                searchCooldownTimeoutRef.current = setTimeout(() => {
                    searchCooldownRef.current = false;
                    setSearchCooldown(false);
                }, 2000);
            }
        }
    };

    const searchByInfo = async (setLoading, setLastError, searchScrollSnapBy) => {
        // Check cooldown
        if (searchCooldownRef.current) return;

        setLastError(null);
        if (!(await checkAlive(setLoading, setLastError))) return;

        // Clear any existing timeout
        if (searchCooldownTimeoutRef.current) {
            clearTimeout(searchCooldownTimeoutRef.current);
        }

        // Set cooldown
        searchCooldownRef.current = true;
        setSearchCooldown(true);
        const m = courseSearchInput.trim().match(/^([A-Za-z]{2,4})\s+([A-Za-z0-9]+)$/);
        if (!m) { setLastError("Use format like CSE 381"); notify("Use format like CSE 381", "error"); return; }
        const subj = m[1].toUpperCase();
        const num = m[2];
        const campusArg = buildCampusArg();
        const campusLine = campusArg ? `${campusArg}` : "";
        const query = `
        query {
          getCourseByInfo(input:{
            term: "${term}"
            ${campusLine}
            subject: ["${subj}"]
            courseNum: "${num}"
          }) {
            ... on SuccessCourse {
              courses { subject courseNum title section crn campus credits capacity requests delivery }
            }
            ... on ErrorCourse { error message }
          }
        }`;
        let list = [];
        try {
            setLoading(true);
            setSearchResults([]); // Clear previous results while loading
            const res = await fetch(GRAPHQL_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
            const data = await res.json();
            const node = data?.data?.getCourseByInfo;
            list = node?.courses ?? [];
            if (list.length === 0) {
                notify(node?.message || "No results found", "error");
            }
            setSearchResults(list);
        } catch {
            setLastError("Search failed");
            notify("Search failed", "error");
        } finally {
            setLoading(false);

            // Clear any existing timeout
            if (searchCooldownTimeoutRef.current) {
                clearTimeout(searchCooldownTimeoutRef.current);
            }

            // Clear cooldown immediately if results returned, otherwise after 2 seconds
            if (list.length > 0) {
                searchCooldownRef.current = false;
                setSearchCooldown(false);
                // Scroll to results card
                setTimeout(() => searchScrollSnapBy(1), 100);
            } else {
                // Reset cooldown after 2 seconds if no results
                searchCooldownTimeoutRef.current = setTimeout(() => {
                    searchCooldownRef.current = false;
                    setSearchCooldown(false);
                }, 2000);
            }
        }
    };

    return {
        crnInput, setCrnInput,
        courseSearchInput, setCourseSearchInput,
        searchResults, setSearchResults,
        searchCooldown,
        searchByCRN,
        searchByInfo
    };
}
