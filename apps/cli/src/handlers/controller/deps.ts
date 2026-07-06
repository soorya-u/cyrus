import { controllerContract } from "@cyrus/connections/contracts/controller";
import type { RtcContext } from "@cyrus/connections/rtc/peer";
import { implement } from "@orpc/server";
import type { WorkerRuntime } from "@/core";

export function defineControllerOs() {
	return implement(controllerContract).$context<RtcContext>();
}

export type ControllerOs = ReturnType<typeof defineControllerOs>;

export type ControllerDeps = {
	os: ControllerOs;
	runtime: WorkerRuntime;
};
