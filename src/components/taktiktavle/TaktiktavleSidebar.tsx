"use client";

import { usePathname } from "next/navigation";
import { useTaktiktavleUi, type TaktikTool } from "@/components/taktiktavle/TaktiktavleProvider";

function ToolButton({
  tool,
  activeTool,
  setTool,
  label,
}: {
  tool: TaktikTool;
  activeTool: TaktikTool;
  setTool: (t: TaktikTool) => void;
  label: string;
}) {
  const active = activeTool === tool;
  return (
    <button
      type="button"
      onClick={() => setTool(tool)}
      className={
        "w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold transition " +
        (active ? "bg-white/15" : "hover:bg-white/10")
      }
    >
      {label}
    </button>
  );
}

export default function TaktiktavleSidebar() {
  const pathname = usePathname();
  const show = pathname === "/taktiktavle" || pathname.startsWith("/taktiktavle/");
  const { tool, setTool, strokeWidth, setStrokeWidth, color, setColor } = useTaktiktavleUi();

  if (!show) return null;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="text-xs font-extrabold tracking-wide opacity-90">VÆRKTØJ</div>
        <div className="mt-2 space-y-1">
          <ToolButton tool="select" activeTool={tool} setTool={setTool} label="Marker" />
          <ToolButton tool="eraser" activeTool={tool} setTool={setTool} label="Slet (klik)" />
        </div>
      </div>

      <div>
        <div className="text-xs font-extrabold tracking-wide opacity-90">LINJER</div>
        <div className="mt-2 space-y-1">
          <ToolButton tool="line" activeTool={tool} setTool={setTool} label="Linje" />
          <ToolButton tool="arrow" activeTool={tool} setTool={setTool} label="Pil" />
        </div>
      </div>

      <div>
        <div className="text-xs font-extrabold tracking-wide opacity-90">TILBEHØR</div>
        <div className="mt-2 space-y-1">
          <ToolButton tool="player" activeTool={tool} setTool={setTool} label="Spiller (prik)" />
          <ToolButton tool="cone" activeTool={tool} setTool={setTool} label="Kegle" />
          <ToolButton tool="text" activeTool={tool} setTool={setTool} label="Tekst" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-extrabold tracking-wide opacity-90">INDSTILLINGER</div>
        <label className="block text-xs font-semibold">
          <div className="mb-1 opacity-90">Farve</div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-full cursor-pointer rounded-md border border-white/20 bg-white/10"
          />
        </label>

        <label className="block text-xs font-semibold">
          <div className="mb-1 opacity-90">Bredde: {strokeWidth}</div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>

      <div className="rounded-md border border-white/15 bg-white/5 p-2 text-[11px] leading-4 opacity-90">
        Tips: Brug mus/trackpad til at tegne. Vælg "Slet" og klik på et objekt for at fjerne det.
      </div>
    </div>
  );
}
