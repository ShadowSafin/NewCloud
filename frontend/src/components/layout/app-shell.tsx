"use client";

import React, { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const childrenArray = React.Children.toArray(children);
  
  let headerElement: ReactNode = null;
  let mainContent: ReactNode = null;

  if (childrenArray.length > 1) {
    headerElement = childrenArray[0];
    mainContent = childrenArray.slice(1);
  } else {
    mainContent = childrenArray[0];
  }

  return (
    <div className="h-screen w-screen bg-[#04020a] relative flex flex-col overflow-hidden">
      {/* Background Gradients & Grid Pattern */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-cyan-950/15 blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[500px] h-[500px] rounded-full bg-indigo-950/10 blur-[120px] pointer-events-none" />

      {/* Full-height app layout */}
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        {/* Header at the top */}
        {headerElement && (
          <div className="w-full shrink-0 relative z-20">
            {headerElement}
          </div>
        )}

        {/* Sidebar + Main content split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-black/10">
            {mainContent}
          </div>
        </div>
      </div>
    </div>
  );

}
