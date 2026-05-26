const bridge = window.nexxcloud;
const byId = (id) => document.getElementById(id);
let currentState = null;

function render(state) {
  currentState = state;
  const configured = state.configured;
  const running = state.status === "running";
  byId("statusTitle").textContent = {
    "not-configured": "Ready to configure",
    stopped: "Server stopped",
    starting: "Starting server",
    running: "Online",
    error: "Needs attention",
  }[state.status] || state.status;
  byId("statusDetail").textContent = state.statusMessage || (
    configured ? `Dashboard ready at ${state.configuration.dashboardUrl}` : "Choose a storage directory to create your local cloud."
  );
  byId("indicator").className = `indicator ${state.status}`;
  byId("openDashboard").classList.toggle("hidden", !running);
  byId("configuration").classList.toggle("hidden", configured);
  byId("controls").classList.toggle("hidden", !configured);

  if (configured) {
    byId("dataDirectory").value = state.configuration.dataDirectory;
    byId("frontendPort").value = state.configuration.frontendPort;
    byId("autoStart").checked = state.configuration.autoStart;
    byId("openBrowser").checked = state.configuration.openBrowserOnLaunch;
    byId("startServer").disabled = running || state.status === "starting";
    byId("restartServer").disabled = !running;
    byId("stopServer").disabled = !running;
    byId("createBackup").disabled = state.status === "starting";
  }
}

async function update() {
  render(await bridge.getState());
}

byId("chooseDirectory").addEventListener("click", async () => {
  const selection = await bridge.chooseDataDirectory();
  if (selection) byId("dataDirectory").value = selection;
});

byId("configuration").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const state = await bridge.saveConfiguration({
      dataDirectory: byId("dataDirectory").value,
      frontendPort: Number(byId("frontendPort").value),
      autoStart: byId("autoStart").checked,
      openBrowserOnLaunch: byId("openBrowser").checked,
    });
    render(state);
    render(await bridge.startServer());
  } catch (error) {
    byId("statusTitle").textContent = "Could not save setup";
    byId("statusDetail").textContent = error.message || "Check your selected location and port.";
    byId("indicator").className = "indicator error";
  }
});

byId("editSettings").addEventListener("click", () => {
  byId("configuration").classList.remove("hidden");
  byId("controls").classList.add("hidden");
});
byId("startServer").addEventListener("click", async () => render(await bridge.startServer()));
byId("stopServer").addEventListener("click", async () => render(await bridge.stopServer()));
byId("restartServer").addEventListener("click", async () => render(await bridge.restartServer()));
byId("openDashboard").addEventListener("click", () => bridge.openDashboard());
byId("openData").addEventListener("click", () => bridge.openDataDirectory());
byId("openLogs").addEventListener("click", () => bridge.openLogs());
byId("createBackup").addEventListener("click", async () => render(await bridge.createBackup()));
bridge.onState(render);
void update();
