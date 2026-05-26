const bridge = window.nexxcloudDesktop;
const byId = (id) => document.getElementById(id);
let latestState = null;

function statusTitle(status) {
  return {
    searching: "Finding your server",
    connecting: "Connecting",
    connected: "Connected",
    offline: "Connection unavailable",
    settings: "Settings",
  }[status] || "NexxCloud";
}

function render(state) {
  latestState = state;
  const configuration = state.configuration;
  byId("indicator").className = `indicator ${state.status}`;
  byId("statusTitle").textContent = statusTitle(state.status);
  byId("statusDetail").textContent = state.message;
  byId("serverUrl").value = configuration.serverUrl;
  byId("autoStart").checked = configuration.autoStart;
  byId("autoReconnect").checked = configuration.autoReconnect;
  byId("minimizeToTray").checked = configuration.minimizeToTray;
  byId("connect").disabled = state.status === "connecting" || state.status === "searching";
  byId("retry").disabled = state.status === "connecting" || state.status === "searching";
  byId("returnToApp").classList.toggle("hidden", !state.connectedUrl);

  const recent = configuration.recentServers || [];
  byId("recentSection").classList.toggle("hidden", recent.length === 0);
  const list = byId("recentServers");
  list.replaceChildren();
  recent.forEach((server) => {
    const button = document.createElement("button");
    button.className = "recent-button";
    button.type = "button";
    button.textContent = server;
    button.title = server;
    button.addEventListener("click", () => {
      byId("serverUrl").value = server;
      void connect(server);
    });
    list.appendChild(button);
  });
}

function showError(error) {
  byId("indicator").className = "indicator offline";
  byId("statusTitle").textContent = "Could not connect";
  byId("statusDetail").textContent = error && error.message ? error.message : "Check the server address and try again.";
}

async function connect(serverUrl) {
  try {
    render(await bridge.saveSettings({
      serverUrl,
      autoStart: byId("autoStart").checked,
      autoReconnect: byId("autoReconnect").checked,
      minimizeToTray: byId("minimizeToTray").checked,
    }));
    render(await bridge.connect(serverUrl));
  } catch (error) {
    showError(error);
  }
}

byId("connection").addEventListener("submit", (event) => {
  event.preventDefault();
  void connect(byId("serverUrl").value);
});

["autoStart", "autoReconnect", "minimizeToTray"].forEach((id) => {
  byId(id).addEventListener("change", async () => {
    try {
      render(await bridge.saveSettings({
        serverUrl: byId("serverUrl").value,
        autoStart: byId("autoStart").checked,
        autoReconnect: byId("autoReconnect").checked,
        minimizeToTray: byId("minimizeToTray").checked,
      }));
    } catch (error) {
      showError(error);
    }
  });
});

byId("retry").addEventListener("click", async () => {
  try {
    render(await bridge.retry());
  } catch (error) {
    showError(error);
  }
});
byId("returnToApp").addEventListener("click", async () => {
  try {
    render(await bridge.returnToApp());
  } catch (error) {
    showError(error);
  }
});
byId("clearCache").addEventListener("click", async () => {
  try {
    render(await bridge.clearCache());
  } catch (error) {
    showError(error);
  }
});
byId("openLogs").addEventListener("click", () => bridge.openLogs());
byId("resetApp").addEventListener("click", async () => {
  if (window.confirm("Clear desktop session data and reset the saved server?")) {
    try {
      render(await bridge.resetApp());
    } catch (error) {
      showError(error);
    }
  }
});

bridge.onState(render);
void bridge.getState().then(render);
