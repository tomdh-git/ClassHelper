export const hashHue = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    // Use golden angle approximation (approx 137.5 degrees) to distribute hues
    // Multiply hash by golden angle and take modulo 360
    return Math.abs((h * 137.508) % 360);
};

export const courseKey = (c) => `${c.subject || ''}-${c.courseNum || ''}-${c.crn || ''}`;

export const hueForCourse = (c, courseHues) => {
    const key = courseKey(c);
    return courseHues[key] ?? 200; // default hue
};

export const chipStyleForHue = (h, darkMode) => {
    if (darkMode) {
        return {
            '--chip-bg': `hsla(${h}, 70%, 18%, 0.65)`,
            '--chip-border': `hsla(${h}, 80%, 58%, 0.5)`,
            '--chip-fg': '#f5f5f7',
        };
    }
    return {
        '--chip-bg': `hsla(${h}, 95%, 95%, 1)`,
        '--chip-border': `hsla(${h}, 70%, 70%, 0.8)`,
        '--chip-fg': '#1f2937',
    };
};

export const eventStyleForHue = (h, darkMode) => {
    if (darkMode) {
        return {
            '--ev-bg': `hsla(${h}, 70%, 45%, 0.28)`,
            '--ev-border': `hsla(${h}, 80%, 60%, 0.55)`,
            '--ev-fg': '#ffffff',
        };
    }
    return {
        '--ev-bg': `hsla(${h}, 90%, 65%, 0.20)`,
        '--ev-border': `hsla(${h}, 85%, 55%, 0.5)`,
        '--ev-fg': '#1f2937',
    };
};
