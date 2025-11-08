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

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        backgroundMaterial: 'acrylic',
        visualEffectState: 'active',
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: false, // allow cross-origin requests for file:// origin
        }
    });

    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL('http://localhost:3000');
    } else {
        // In production, this file lives alongside electron.js inside the build folder within app.asar
        const indexPath = path.join(__dirname, 'index.html');
        win.loadFile(indexPath);
    }

    // Ensure menu stays hidden (no toolbar)
    win.setMenuBarVisibility(false);
    win.setBackgroundColor('#00000000');
    win.once('ready-to-show', () => win.show());
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
