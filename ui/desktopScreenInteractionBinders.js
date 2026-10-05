import { bindDesktopRecordInput } from "./interactions/desktopRecordInputInteractions.js";
import { bindDesktopResult } from "./interactions/desktopResultInteractions.js";

export const DESKTOP_SCREEN_INTERACTION_BINDERS = Object.freeze({
  "record-input": bindDesktopRecordInput,
  result: bindDesktopResult,
});
