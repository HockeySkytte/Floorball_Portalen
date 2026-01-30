"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type TaktikTool =
  | "select"
  | "line"
  | "arrow"
  | "player"
  | "cone"
  | "text"
  | "eraser";

type TaktiktavleUiState = {
  tool: TaktikTool;
  setTool: (t: TaktikTool) => void;
  strokeWidth: number;
  setStrokeWidth: (n: number) => void;
  color: string;
  setColor: (c: string) => void;
};

const Ctx = createContext<TaktiktavleUiState | null>(null);

export default function TaktiktavleProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<TaktikTool>("select");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [color, setColor] = useState("#111827");

  const value = useMemo(
    () => ({ tool, setTool, strokeWidth, setStrokeWidth, color, setColor }),
    [tool, strokeWidth, color]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaktiktavleUi() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTaktiktavleUi must be used within TaktiktavleProvider");
  return v;
}
