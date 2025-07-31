// src/components/terminal/Terminal.jsx
"use client";

import { useEffect, useRef } from "react";

export default function Terminal({ logs }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-900 text-white font-mono rounded-lg shadow-lg h-full flex flex-col ">
      <div className="bg-gray-800 px-4 py-2 rounded-t-lg">
        <h2 className="text-lg font-bold">Terminal</h2>
      </div>
      <div ref={terminalRef} className="p-4 flex-grow h-full max-h-[22rem] overflow-y-scroll">
        {logs.map((log, index) => (
          <div key={index} className="flex">
            <span className="text-gray-500 mr-2">{`>`}</span>
            <p>{log}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
