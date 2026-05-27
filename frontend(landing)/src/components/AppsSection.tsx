import { Monitor, Smartphone, Download, Wifi, QrCode } from "lucide-react";

const repositoryUrl = "https://github.com/ShadowSafin/NexxCloud";
const releaseDownloadUrl = `${repositoryUrl}/releases/latest/download`;

export default function AppsSection() {
  return (
    <section id="apps" className="defer-render py-24 md:py-32 px-6 md:px-12 bg-zinc-950/20 relative z-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Title Block */}
        <div className="text-center mb-20">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-3">
            Client applications
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground">
            Run locally. Connect natively.
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mt-4 leading-relaxed tracking-tight">
            The Windows server installer, Windows desktop client, and Android wrapper reuse the same NexxCloud web interface.
          </p>
        </div>

        {/* Windows and Android Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Windows Desktop Apps Card */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/10 p-8 flex flex-col justify-between gap-8 hover:border-white/10 transition-all duration-500 relative overflow-hidden group">
            <div className="absolute inset-0 bg-radial-bg opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-cyan text-xs font-mono font-semibold tracking-wider">
                <Monitor className="w-4 h-4" />
                <span>WINDOWS OS</span>
              </div>
              <h3 className="text-xl md:text-2xl font-medium tracking-tight text-foreground">
                Server host and desktop client
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed tracking-tight">
                The Windows server host bundles a local SQLite runtime with tray controls. The desktop client connects securely to an existing server.
              </p>

              {/* Realistic Windows App CSS Mockup */}
              <div className="rounded-xl border border-white/5 bg-zinc-950/80 p-5 shadow-2xl mt-4 max-w-md mx-auto w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/2 to-transparent pointer-events-none" />
                {/* Windows title bar */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 text-[11px] text-zinc-500 font-mono">
                  <div className="flex items-center gap-1.5 font-sans font-semibold text-zinc-300">
                    <Monitor className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>NexxCloud Server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-0.5 bg-zinc-700 inline-block" />
                    <span className="w-2 h-2 border border-zinc-700 inline-block" />
                    <span className="w-2 h-2 text-[8px] font-sans flex items-center justify-center text-zinc-700">✕</span>
                  </div>
                </div>

                {/* Status pane */}
                <div className="flex items-center justify-between bg-zinc-900/40 border border-white/5 p-3 rounded-lg mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-zinc-300">Local server running</span>
                      <span className="text-[10px] text-zinc-500 font-mono">SQLite runtime + workers</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded font-mono">
                    Node-01
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-zinc-400">
                  <div className="border border-white/5 bg-zinc-900/10 p-2.5 rounded-lg flex flex-col gap-1">
                    <span className="text-zinc-500">DASHBOARD</span>
                    <span className="text-brand-cyan font-bold text-[12px]">localhost:3000</span>
                  </div>
                  <div className="border border-white/5 bg-zinc-900/10 p-2.5 rounded-lg flex flex-col gap-1">
                    <span className="text-zinc-500">PACKAGE</span>
                    <span className="text-zinc-300 font-bold text-[12px]">NSIS EXE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Download actions */}
            <div className="relative z-10 flex flex-wrap items-center gap-3 border-t border-white/5 pt-6 mt-2">
              <a
                href={`${releaseDownloadUrl}/NexxCloud.Desktop.Setup.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-zinc-950 font-medium text-[13px] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Desktop Client</span>
              </a>

              <a
                href={`${releaseDownloadUrl}/NexxCloud.Server.Setup.exe`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-zinc-950 font-medium text-[13px] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Desktop Server</span>
              </a>

              <span className="px-2.5 py-1 rounded-full bg-brand-cyan/15 text-brand-cyan text-[10px] font-mono font-medium">
                BUILD SCRIPTS INCLUDED
              </span>
            </div>
          </div>

          {/* Android Wrapper App Card */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/10 p-8 flex flex-col justify-between gap-8 hover:border-white/10 transition-all duration-500 relative overflow-hidden group">
            <div className="absolute inset-0 bg-radial-bg opacity-0 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-brand-purple text-xs font-mono font-semibold tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>ANDROID</span>
              </div>
              <h3 className="text-xl md:text-2xl font-medium tracking-tight text-foreground">
                Android companion wrapper
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed tracking-tight">
                The Android shell opens your LAN-hosted web interface with native camera and share actions plus network reconnect handling.
              </p>

              {/* Realistic Android CSS Mockup */}
              <div className="w-[180px] h-[320px] rounded-[30px] border-4 border-zinc-800 bg-[#030303] shadow-2xl mx-auto mt-4 relative overflow-hidden p-3 flex flex-col justify-between">
                {/* Phone Speaker Notch */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-4 bg-zinc-800 rounded-full flex items-center justify-center">
                  <div className="w-10 h-1 bg-black rounded-full" />
                </div>
                
                {/* Top Status Indicators inside Phone */}
                <div className="flex items-center justify-between text-[7px] text-zinc-500 font-mono mt-1 px-1">
                  <span>NexxCloud</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="w-2 h-2 text-brand-cyan" />
                    <span>LTE</span>
                  </div>
                </div>

                {/* Connect Screen inside Phone */}
                <div className="flex flex-col items-center justify-center text-center gap-3 my-auto">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 flex items-center justify-center border border-brand-cyan/30 shadow-lg">
                    <QrCode className="w-6 h-6 text-brand-cyan" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-300">Connect to Node</span>
                    <span className="text-[7px] text-zinc-500 tracking-tight mt-0.5">Scan Server QR Code</span>
                  </div>
                  <div className="w-full max-w-[120px] px-2 py-1.5 rounded bg-zinc-900 border border-white/5 text-[7px] text-zinc-400 text-center font-mono">
                    http://192.168.0.187:3000
                  </div>
                  <div className="w-full max-w-[120px] py-1 rounded bg-brand-cyan text-black text-[8px] font-bold shadow-md">
                    Connect Node
                  </div>
                </div>

                {/* Bottom Navigation Indicators inside Phone */}
                <div className="flex items-center justify-around border-t border-white/5 pt-2 text-[6px] text-zinc-600 font-semibold uppercase font-mono">
                  <span className="text-brand-cyan">Vault</span>
                  <span>Sync</span>
                  <span>Nodes</span>
                </div>
              </div>
            </div>

            {/* Download actions */}
            <div className="relative z-10 flex flex-wrap items-center gap-3 border-t border-white/5 pt-6 mt-2">
              <a
                href={`${releaseDownloadUrl}/NexxCloud-release.apk`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-violet-500 text-white font-medium text-[13px] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download APK</span>
              </a>

              <span className="px-2.5 py-1 rounded-full bg-brand-purple/15 text-brand-purple text-[10px] font-mono font-medium">
                ANDROID APK
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
