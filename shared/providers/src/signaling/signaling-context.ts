import { createContext } from "react";
import type { SignalingConnection } from "../types";

export const SignalingConnectionContext =
	createContext<SignalingConnection | null>(null);
