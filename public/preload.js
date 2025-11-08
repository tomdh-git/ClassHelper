const { contextBridge, ipcRenderer } = require('electron');

// Apply theme before React mounts to avoid flash
try {
  const cfg = ipcRenderer.sendSync('config:read-sync');
  if (cfg && cfg.darkMode) {
    // Add on <html> so descendant selectors like .dark-mode .app-wrapper apply
    document.documentElement.classList.add('dark-mode');
  }
  // Ensure we never fill the OS window with an opaque color before React/CSS loads (transparent window)
  const s = document.createElement('style');
  s.id = 'preload-theme-style';
  s.textContent = 'html,body{background-color: transparent !important;}';
  document.head.appendChild(s);
} catch {}

contextBridge.exposeInMainWorld('electronAPI', {
  readConfig: () => ipcRenderer.invoke('config:read'),
  writeConfig: (data) => ipcRenderer.invoke('config:write', data),
  graphql: (query, url) => ipcRenderer.invoke('api:graphql', { query, url }),
  closeApp: () => ipcRenderer.invoke('app:close'),
});
