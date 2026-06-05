(function () {
  window.AGGS_APP_MODULES = window.AGGS_APP_MODULES || {};

  window.AGGS_APP_MODULES.createSyncController = function createSyncController(ctx) {
    const {
      getData,
      setData,
      baseData,
      Engine,
      TradeMap,
      sharedSync,
      state,
      isAdmin,
      updateSourceNote,
      render,
      ensureSelectedNation,
      populateNationSelect,
      clearPendingChanges
    } = ctx;
    const AUTO_PUBLISH_DELAY_MS = 1800;

    function stripRuntimeFields(snapshot) {
      if (snapshot.tradeNetwork?.geography) {
        delete snapshot.tradeNetwork.geography;
      }
      return snapshot;
    }

    function persistenceSnapshot() {
      return stripRuntimeFields(Engine.clone(getData()));
    }

    function saveLedger(options = {}) {
      const data = getData();
      if (options.touch !== false) data.meta.updatedAt = new Date().toISOString();
      Engine.save(persistenceSnapshot(), { touch: false });
    }

    function saveWorkingState(message) {
      saveLedger();
      state.notice = message || "Saved locally.";
      scheduleSharedPublish(state.notice);
      updateSourceNote();
      render();
    }

    function resetWorkingState() {
      setData(Engine.reset(baseData));
      sharedSync.revision = null;
      clearPendingChanges?.();
      state.notice = sharedSync.enabled ? "Reloading the live ledger." : "Cleared local fallback state.";
      ensureSelectedNation();
      updateSourceNote();
      render();
      if (sharedSync.enabled) fetchSharedState();
    }

    function downloadText(filename, text, mimeType = "application/json") {
      const blob = new Blob([text], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function readSharedJson(response) {
      const text = await response.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        return null;
      }
    }

    function markSync(status, message = "") {
      sharedSync.status = status;
      sharedSync.message = message;
      updateSourceNote();
    }

    function applySharedData(payload) {
      if (!payload?.data || sharedSync.hasPendingLocalChange || sharedSync.isPublishing) return false;
      const nextRevision = Number(payload.revision || 0);
      if (nextRevision && nextRevision === sharedSync.revision) return false;
      const nextData = Engine.normalizeState(Engine.clone(payload.data));
      TradeMap.ensureGeography?.(nextData);
      clearPendingChanges?.();
      setData(nextData);
      sharedSync.revision = nextRevision || sharedSync.revision;
      sharedSync.updatedAt = payload.updatedAt || nextData.meta?.updatedAt || "";
      sharedSync.updatedBy = payload.updatedBy || nextData.meta?.updatedBy || "";
      saveLedger({ touch: false });
      populateNationSelect();
      updateSourceNote();
      state.notice = "";
      render();
      return true;
    }

    async function fetchSharedState() {
      if (!sharedSync.enabled || sharedSync.isPublishing || sharedSync.hasPendingLocalChange) return;
      markSync(sharedSync.revision ? "online" : "connecting");
      try {
        const response = await fetch(sharedSync.endpoint, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        const payload = await readSharedJson(response);
        if (response.status === 404 && payload?.code === "NO_SHARED_STATE") {
          markSync("ready-empty", payload.message || "");
          return;
        }
        if (response.status === 404 && !payload) {
          markSync("local");
          return;
        }
        if (!response.ok || !payload?.ok) {
          markSync("offline", payload?.message || "Shared sync is unavailable.");
          return;
        }
        const applied = applySharedData(payload);
        if (!applied) {
          sharedSync.revision = Number(payload.revision || sharedSync.revision || 0);
          sharedSync.updatedAt = payload.updatedAt || sharedSync.updatedAt;
          sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
        }
        markSync("online");
      } catch (error) {
        markSync("offline", "Shared sync is unavailable.");
      }
    }

    async function fetchSharedMeta() {
      if (!sharedSync.enabled || sharedSync.isPublishing || sharedSync.hasPendingLocalChange) return;
      if (!sharedSync.revision) {
        await fetchSharedState();
        return;
      }
      try {
        const response = await fetch(sharedSync.metaEndpoint, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        const payload = await readSharedJson(response);
        if (response.status === 404 && payload?.code === "NO_SHARED_STATE") {
          markSync("ready-empty", payload.message || "");
          return;
        }
        if (!response.ok || !payload?.ok) {
          markSync("offline", payload?.message || "Shared sync is unavailable.");
          return;
        }
        const nextRevision = Number(payload.revision || 0);
        if (nextRevision && nextRevision !== sharedSync.revision) {
          await fetchSharedState();
          return;
        }
        sharedSync.updatedAt = payload.updatedAt || sharedSync.updatedAt;
        sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
        markSync("online");
      } catch (error) {
        markSync("offline", "Shared sync is unavailable.");
      }
    }

    async function fetchSnapshots(force = false) {
      if (!sharedSync.enabled || !isAdmin || sharedSync.isLoadingSnapshots) return;
      if (!force && sharedSync.snapshotsLoaded) return;
      sharedSync.isLoadingSnapshots = true;
      try {
        const response = await fetch("/admin/api/snapshots", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        const payload = await readSharedJson(response);
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Snapshot list is unavailable.");
        sharedSync.snapshots = Array.isArray(payload.snapshots) ? payload.snapshots : [];
        sharedSync.snapshotsLoaded = true;
      } catch (error) {
        sharedSync.snapshotsLoaded = true;
        state.notice = error.message || "Snapshot list is unavailable.";
      } finally {
        sharedSync.isLoadingSnapshots = false;
        if (state.tab === "history") render();
      }
    }

    async function revertSelectedSnapshot() {
      const snapshotRevision = Number(document.getElementById("snapshotSelect")?.value || 0);
      if (!snapshotRevision) {
        state.notice = "Select a revision snapshot first.";
        render();
        return;
      }
      if (!window.confirm(`Revert the live ledger to revision #${snapshotRevision}? The current live state will be saved as a snapshot first.`)) return;
      try {
        const response = await fetch("/admin/api/revert", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ revision: sharedSync.revision, snapshotRevision })
        });
        const payload = await readSharedJson(response);
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Snapshot revert failed.");
        sharedSync.updatedAt = payload.updatedAt || sharedSync.updatedAt;
        sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
        state.notice = `Reverted live ledger to snapshot #${snapshotRevision}.`;
        await fetchSharedState();
        await fetchSnapshots(true);
      } catch (error) {
        state.notice = error.message || "Snapshot revert failed.";
        render();
      }
    }

    async function exportSelectedSnapshot() {
      const snapshotRevision = Number(document.getElementById("snapshotSelect")?.value || 0);
      if (!snapshotRevision) {
        state.notice = "Select a revision snapshot first.";
        render();
        return;
      }
      try {
        const response = await fetch(`/admin/api/snapshots/${snapshotRevision}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        const payload = await readSharedJson(response);
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Snapshot export failed.");
        downloadText(`ag-gs-revision-${snapshotRevision}.json`, JSON.stringify(payload.snapshot, null, 2));
        state.notice = `Exported snapshot #${snapshotRevision}.`;
        render();
      } catch (error) {
        state.notice = error.message || "Snapshot export failed.";
        render();
      }
    }

    function scheduleSharedPublish(message, delay = AUTO_PUBLISH_DELAY_MS) {
      if (!sharedSync.enabled || !isAdmin) return;
      sharedSync.hasPendingLocalChange = true;
      sharedSync.pendingPublishMessage = message || sharedSync.pendingPublishMessage || "Published live changes.";
      markSync("publishing");
      if (sharedSync.isPublishing) {
        sharedSync.publishQueued = true;
        return;
      }
      clearTimeout(sharedSync.publishTimer);
      sharedSync.publishTimer = setTimeout(() => {
        publishSharedState(sharedSync.pendingPublishMessage);
      }, delay);
    }

    async function publishSharedState(message = "Published live changes.") {
      const data = getData();
      if (!sharedSync.enabled || !isAdmin) {
        state.notice = sharedSync.enabled ? "Admin access is required to publish." : "Shared sync is not configured for this host.";
        updateSourceNote();
        render();
        return;
      }
      if (sharedSync.isPublishing) {
        sharedSync.hasPendingLocalChange = true;
        sharedSync.publishQueued = true;
        sharedSync.pendingPublishMessage = message;
        markSync("publishing");
        return;
      }
      clearTimeout(sharedSync.publishTimer);
      sharedSync.hasPendingLocalChange = true;
      sharedSync.isPublishing = true;
      sharedSync.pendingPublishMessage = message;
      markSync("publishing");
      try {
        data.meta.updatedAt = new Date().toISOString();
        const publishData = persistenceSnapshot();
        const response = await fetch(sharedSync.endpoint, {
          method: "PUT",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ data: publishData, revision: sharedSync.revision })
        });
        const payload = await readSharedJson(response);
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || "Publish failed.");
        sharedSync.revision = Number(payload.revision || sharedSync.revision || 0);
        sharedSync.updatedAt = payload.updatedAt || data.meta.updatedAt;
        sharedSync.updatedBy = payload.updatedBy || sharedSync.updatedBy;
        data.meta.updatedBy = sharedSync.updatedBy || data.meta.updatedBy;
        saveLedger({ touch: false });
        sharedSync.isPublishing = false;
        if (sharedSync.publishQueued) {
          sharedSync.publishQueued = false;
          scheduleSharedPublish(sharedSync.pendingPublishMessage || message, AUTO_PUBLISH_DELAY_MS);
          return;
        }
        sharedSync.hasPendingLocalChange = false;
        sharedSync.pendingPublishMessage = "";
        markSync("online");
        state.notice = message;
        fetchSnapshots(true);
        if (document.activeElement?.closest?.("[data-edit]")) {
          updateSourceNote();
        } else {
          render();
        }
      } catch (error) {
        sharedSync.isPublishing = false;
        markSync("offline", error.message || "Shared publish failed.");
        state.notice = `Saved locally. ${error.message || "Live publish failed."}`;
        render();
      }
    }

    function startSharedSync() {
      if (!sharedSync.enabled) {
        markSync("local");
        return;
      }
      fetchSharedState();
      sharedSync.pollTimer = setInterval(fetchSharedMeta, sharedSync.pollMs);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) fetchSharedMeta();
      });
    }

    return {
      persistenceSnapshot,
      saveLedger,
      saveWorkingState,
      resetWorkingState,
      downloadText,
      markSync,
      fetchSharedState,
      fetchSharedMeta,
      fetchSnapshots,
      revertSelectedSnapshot,
      exportSelectedSnapshot,
      scheduleSharedPublish,
      publishSharedState,
      startSharedSync
    };
  };
})();
