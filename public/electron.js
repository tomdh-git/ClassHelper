const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Relax CORS in renderer to allow cross-origin requests from file:// origin
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

const CONFIG_NAME = 'classhelper.config.json';

function getConfigPath() {
    // Store config internally in userData (per-user app data), not next to the exe
    const baseDir = app.getPath('userData');
    return path.join(baseDir, CONFIG_NAME);
}

let splashWindow = null;
let mainWindow = null;

function createSplashWindow() {
    // Read config synchronously to determine theme
    let isDark = true;
    try {
        const p = getConfigPath();
        if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf-8');
            const cfg = JSON.parse(raw);
            if (cfg && cfg.darkMode === false) {
                isDark = false;
            }
        }
    } catch (e) {
        // Default to dark
    }

    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: false,
        backgroundColor: isDark ? '#050509' : '#f5f5f7',
        alwaysOnTop: true,
        skipTaskbar: false,
        resizable: false,
        show: true, // Show immediately - window appears instantly
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            webSecurity: false,
            backgroundThrottling: false, // Don't throttle background
        }
    });

    splashWindow.center();

    const isDev = !app.isPackaged;
    const splashPath = isDev ? path.join(__dirname, 'splash.html') : path.join(__dirname, 'splash.html');
    
    splashWindow.loadFile(splashPath);
    
    // Inject theme information after DOM is ready
    splashWindow.webContents.once('dom-ready', () => {
        splashWindow.webContents.executeJavaScript(`
            (function() {
                const isDark = ${isDark};
                if (!isDark) {
                    document.body.classList.add('light-theme');
                    document.getElementById('splashLogo').src = './assets/img/logo_light.png';
                } else {
                    document.getElementById('splashLogo').src = './assets/img/logo_dark.png';
                }
            })();
        `);
    });
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 680,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        roundedCorners: true,
        autoHideMenuBar: true,
        show: false, // Don't show until ready
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: false, // allow cross-origin requests for file:// origin
            hardwareAcceleration: true,
            enableRemoteModule: false,
            nodeIntegration: false,
            v8CacheOptions: 'code',
        }
    });

    const isDev = !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        // In production, this file lives alongside electron.js inside the build folder within app.asar
        const indexPath = path.join(__dirname, 'index.html');
        mainWindow.loadFile(indexPath);
    }

    // Ensure menu stays hidden (no toolbar)
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setBackgroundColor('#00000000');

    // Show window and close splash when ready
    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            setTimeout(() => {
                if (splashWindow) {
                    splashWindow.close();
                }
                if (mainWindow) {
                    mainWindow.show();
                }
            }, 500); // Small delay for smooth transition
        } else {
            mainWindow.show();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC for config read/write
ipcMain.handle('config:read', async () => {
    try {
        const p = getConfigPath();
        if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf-8');
            return JSON.parse(raw);
        }
        return null;
    } catch (e) {
        return null;
    }
});

ipcMain.handle('config:write', async (_evt, data) => {
    try {
        const p = getConfigPath();
        fs.writeFileSync(p, JSON.stringify(data ?? {}, null, 2), 'utf-8');
        return true;
    } catch (e) {
        return false;
    }
});

// Optional main-process GraphQL fetch to bypass renderer networking quirks
ipcMain.handle('api:graphql', async (_evt, payload) => {
    try {
        const { url, query } = payload || {};
        if (!url || !query) return { error: 'missing-params' };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { json = { error: 'invalid-json', raw: text }; }
        return { status: res.status, ok: res.ok, data: json };
    } catch (e) {
        return { error: String(e && e.message || e) };
    }
});

ipcMain.handle('app:close', async () => {
    try {
        const focused = BrowserWindow.getFocusedWindow();
        if (focused) focused.close(); else app.quit();
        return true;
    } catch { return false; }
});

// Synchronous read to prevent theme flash in preload
ipcMain.on('config:read-sync', (event) => {
    try {
        const p = getConfigPath();
        if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf-8');
            event.returnValue = JSON.parse(raw);
            return;
        }
        event.returnValue = null;
    } catch {
        event.returnValue = null;
    }
});

// Show splash window immediately when app is ready
app.whenReady().then(() => {
    // Create and show splash first (instant)
    createSplashWindow();
    // Then create main window (hidden until ready)
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
        createWindow();
    }
});
