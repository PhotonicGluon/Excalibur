import { OPAQUEClient } from "./client";

export const SERVER_IDENTITY = Buffer.from("Excalibur-Server");
export const OPAQUE_OPRF_TYPE = "ristretto255-sha512";
export const OPAQUE = new OPAQUEClient(OPAQUE_OPRF_TYPE);

export * from "./structures";
