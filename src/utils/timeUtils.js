export const parseTimeStr = (s) => {
    if (!s) return null;
    const str = String(s).trim().toLowerCase();
    const m = str.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap]m)?\s*$/);
    if (!m) return null;
    let hr = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3];
    if (ap) {
        if (ap === 'pm' && hr < 12) hr += 12;
        if (ap === 'am' && hr === 12) hr = 0;
    }
    if (!ap && hr <= 24 && min <= 59) {
        // assume 24h
    }
    return hr * 60 + min;
};

export const formatTime = (val) => {
    const hour = Math.floor(val);
    const min = val % 1 === 0.5 ? "30" : "00";
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${min} ${ampm}`;
};

export const formatTimeForQuery = (val) => {
    const hour = Math.floor(val);
    const min = val % 1 === 0.5 ? "30" : "00";
    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${min}${ampm}`;
};
