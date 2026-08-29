/**
 * ONEHEALTH AI - Offline & Standalone Sync Engine
 * Handles online/offline detection, background sync when API is present,
 * and graceful fallback to standalone edge mode when hosted statically without Python.
 */

class OneHealthSyncEngine {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
    this.hasBackend = true;
    this.apiBase = window.location.origin;
  }

  init() {
    window.addEventListener('online', () => {
      console.log('[SyncEngine] Network connection active');
      this.setOnlineStatus(true);
      this.triggerAutoSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncEngine] Operating in offline mode');
      this.setOnlineStatus(false);
    });

    // Check backend presence
    this.checkConnection();

    // Periodic check
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.hasBackend) {
        this.triggerAutoSync(true);
      }
    }, 30000);
  }

  setOnlineStatus(status) {
    this.isOnline = status;
    this.notifyListeners({ type: 'network_status', isOnline: this.isOnline });
  }

  async checkConnection() {
    try {
      const resp = await fetch(`${this.apiBase}/api/sync/status`, { method: 'GET', cache: 'no-store' });
      if (resp.ok) {
        this.hasBackend = true;
        this.setOnlineStatus(true);
        return true;
      }
    } catch (e) {
      // Backend not running (Standalone / Static hosting mode)
      this.hasBackend = false;
    }
    return false;
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(event) {
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch (err) {
        console.error('[SyncEngine] Listener error:', err);
      }
    }
  }

  async triggerAutoSync(silent = false) {
    if (this.isSyncing) return;

    // In static / serverless mode without backend
    if (!this.hasBackend) {
      if (!silent) {
        this.notifyListeners({
          type: 'standalone_notice',
          message: 'Running in Standalone Client Mode. All records are saved securely in local IndexedDB.'
        });
      }
      return;
    }

    if (!this.isOnline) {
      if (!silent) {
        this.notifyListeners({ type: 'sync_error', message: 'Offline mode active. Records saved locally.' });
      }
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start', message: 'Synchronizing...' });

    try {
      const pendingQueue = await window.oneHealthDB.getPendingSyncItems();
      const casesToSync = [];
      const reviewsToSync = [];
      const queueIdsToClear = [];

      for (const item of pendingQueue) {
        queueIdsToClear.push(item.queue_id);
        if (item.action === 'SAVE_CASE') {
          casesToSync.push(item.payload);
        } else if (item.action === 'SAVE_REVIEW') {
          reviewsToSync.push(item.payload);
        }
      }

      const lastSyncTime = await window.oneHealthDB.getSetting('last_server_sync_timestamp', null);

      const payload = {
        device_id: 'browser-pwa-' + (localStorage.getItem('onehealth_device_id') || 'dev1'),
        last_sync_timestamp: lastSyncTime,
        cases: casesToSync,
        reviews: reviewsToSync
      };

      const response = await fetch(`${this.apiBase}/api/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const syncResult = await response.json();

      await window.oneHealthDB.markSyncItemsCompleted(queueIdsToClear, syncResult.server_updates || []);
      if (syncResult.active_alerts && syncResult.active_alerts.length > 0) {
        await window.oneHealthDB.saveAlerts(syncResult.active_alerts);
      }
      await window.oneHealthDB.saveSetting('last_server_sync_timestamp', syncResult.server_timestamp);

      this.notifyListeners({
        type: 'sync_success',
        casesSynced: syncResult.synced_case_ids.length,
        reviewsSynced: syncResult.synced_review_ids.length
      });

    } catch (error) {
      this.hasBackend = false;
      this.notifyListeners({
        type: 'sync_error',
        message: 'Standalone mode active. All records remain safely in local IndexedDB.'
      });
    } finally {
      this.isSyncing = false;
    }
  }
}

window.oneHealthSync = new OneHealthSyncEngine();
