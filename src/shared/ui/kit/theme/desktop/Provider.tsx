"use client";
import { createContext } from "react";
export type Design = "regular" | "uup";
export const ThemeContext = createContext<{design: Design; theme: "light" | "dark"}>({design: "uup", theme: "light"});

