import { renderInterpretationRoomScreenWithPresentation } from "../interpretationRoomScreen.js";
export function renderInterpretationRoomScreen(args) {
  return renderInterpretationRoomScreenWithPresentation(args, { compactLayout: false, selectDefaultRegion: true });
}
