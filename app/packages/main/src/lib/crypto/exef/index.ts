import ExEF from "./exef";

export default ExEF;

export { CURRENT_VERSION, identifyVersion, SUPPORTED_VERSIONS, type ExEFOptions, type ExEFVersion } from "./exef";

export { type CipherID, type KeyStrength } from "./base";
export { default as PADME } from "./padme";

export { default as ExEFv3 } from "./v3";
export { default as ExEFv4 } from "./v4";

// ExEF v3 structures. The unprefixed names are kept for backwards compatibility, from when this
// module only implemented v3
export { Footer as ExEFFooter, Header as ExEFHeader, Footer as ExEFv3Footer, Header as ExEFv3Header } from "./v3";
export { Header as ExEFv4Header } from "./v4";
