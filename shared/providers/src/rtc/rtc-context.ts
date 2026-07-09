import { createContext } from "react";
import type { RtcConnectionValue } from "../types";

export const RtcConnectionContext = createContext<RtcConnectionValue | null>(
	null
);
