import type { ControllerContract } from "@cyrus/connections/contracts/controller";
import { connectControllerWeb } from "@cyrus/connections/rtc/controller/web";
import type { RtcConnection } from "@cyrus/connections/rtc/dial";

export type ControllerConnection = RtcConnection<ControllerContract>;

export const connectController = connectControllerWeb;
