import { parseTimeStr } from "./timeUtils";

export const dayCodeToName = (d) => ({ 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'R': 'Thu', 'Th': 'Thu', 'H': 'Thu', 'F': 'Fri', 'S': 'Sat', 'U': 'Sun' }[d] || d);

export const expandDays = (daysStr) => {
    if (!daysStr) return [];
    const s = String(daysStr);
    // Handle "Th" specially, replace with R token then process chars
    const replaced = s.replace(/Th/gi, 'R');
    return Array.from(replaced).map(dayCodeToName);
};

export const extractMeetings = (c) => {
    if (!c) return [];
    const allMeetings = [];

    // First, check for array of meetings (handles multiple meeting times)
    if (Array.isArray(c.meetings)) {
        const parsed = c.meetings.map(m => ({
            day: dayCodeToName(m.day || m.d || m.D),
            start: parseTimeStr(m.start || m.s),
            end: parseTimeStr(m.end || m.e)
        })).filter(m => Number.isFinite(m.start) && Number.isFinite(m.end));
        allMeetings.push(...parsed);
    }

    // Also check for single days/start/end fields (might be a separate meeting)
    const days = c.days || c.meetingDays || c.DayPattern;
    const start = c.start || c.startTime || c.timeStart;
    const end = c.end || c.endTime || c.timeEnd;
    if (days && (start || end)) {
        const startMin = parseTimeStr(start);
        const endMin = parseTimeStr(end);
        if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
            const parsed = expandDays(days).map(d => ({ day: d, start: startMin, end: endMin }));
            // Only add if not already in allMeetings (avoid duplicates)
            for (const p of parsed) {
                const exists = allMeetings.some(m =>
                    m.day === p.day && m.start === p.start && m.end === p.end
                );
                if (!exists) allMeetings.push(p);
            }
        }
    }

    // Try to parse from delivery string - handle multiple time patterns
    const delivery = c.delivery || c.Delivery || '';
    const dlc = String(delivery).trim();

    // Match multiple time patterns in delivery string (e.g., "MWF 10:30am-11:20am MWF 1:15pm-2:10pm")
    const timePatterns = dlc.matchAll(/([MTWRFSU]+)\s+(\d{1,2})(?::(\d{2}))?\s*([ap]m)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)/gi);
    for (const match of timePatterns) {
        const dpat = match[1].toUpperCase();
        const s = `${match[2]}${match[3] ? ':' + match[3] : ''}${match[4].toLowerCase()}`;
        const e = `${match[5]}${match[6] ? ':' + match[6] : ''}${match[7].toLowerCase()}`;
        const startMin = parseTimeStr(s);
        const endMin = parseTimeStr(e);
        if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
            const parsed = expandDays(dpat).map(d => ({ day: d, start: startMin, end: endMin }));
            // Only add if not already in allMeetings
            for (const p of parsed) {
                const exists = allMeetings.some(m =>
                    m.day === p.day && m.start === p.start && m.end === p.end
                );
                if (!exists) allMeetings.push(p);
            }
        }
    }

    // Also try single pattern match for backward compatibility
    if (allMeetings.length === 0) {
        const dm = dlc.match(/^\s*([MTWRFSU]+)/i);
        const tm = dlc.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
        if (dm && tm) {
            const dpat = dm[1].toUpperCase();
            const s = `${tm[1]}${tm[2] ? ':' + tm[2] : ''}${tm[3].toLowerCase()}`;
            const e = `${tm[4]}${tm[5] ? ':' + tm[5] : ''}${tm[6].toLowerCase()}`;
            const startMin = parseTimeStr(s);
            const endMin = parseTimeStr(e);
            if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
                const parsed = expandDays(dpat).map(d => ({ day: d, start: startMin, end: endMin }));
                allMeetings.push(...parsed);
            }
        }
    }

    return allMeetings;
};

export const parseDeliveryDays = (s) => {
    if (!s) return null;
    const lc = String(s).trim().toLowerCase();
    if (/\bweb\b/.test(lc) && !/^\s*[mtwrfsu]+\b/.test(lc)) return 'WEB';
    const m = lc.match(/^\s*([mtwrfsu]+)\b/);
    return m ? m[1].toUpperCase() : null;
};
