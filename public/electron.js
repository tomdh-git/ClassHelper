const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Relax CORS in renderer to allow cross-origin requests from file:// origin
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

// LeviLauncher-style optimizations for instant startup
// Disable unnecessary features that slow down startup
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');
// Faster startup optimizations
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu-vsync');
// Enable faster initialization
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess');

const CONFIG_NAME = 'classhelper.config.json';

function getConfigPath() {
    // Store config internally in userData (per-user app data), not next to the exe
    const baseDir = app.getPath('userData');
    return path.join(baseDir, CONFIG_NAME);
}

let mainWindow = null;

function createWindow() {
    // Set app icon to dark mode logo (already copied by postbuild script)
    const iconPath = path.join(__dirname, 'icon.png');
    
    // Try to set dock icon on macOS if available
    try {
        if (fs.existsSync(iconPath) && app.dock) {
            app.dock.setIcon(iconPath);
        }
    } catch (e) {
        // Icon setting is optional
    }

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
        show: true, // Show immediately for fastest startup
        icon: fs.existsSync(iconPath) ? iconPath : undefined, // Set window icon if available
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

    // Window already showing, just ensure it's focused when ready
    mainWindow.once('ready-to-show', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
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

// Load main window immediately - no splash screen for fastest startup
app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
