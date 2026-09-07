// Which blocks a printout can hold.
//
// An embedded frame — the HTML/CSS/JS block, and the Widget block that nests another custom
// widget — draws nothing on paper: its content lives in another document that the print stylesheet
// cannot reach, and a frame loaded for the page would print as a blank rectangle of unknown height
// (which is exactly what a reader saw: an empty card on the sheet). So those blocks are not offered
// for a printout at all, and one that was picked before this rule is left out with a note rather
// than printed empty. Kept apart from printout.js so the renderer can ask without importing it.

const UNPRINTABLE = new Set(['embed', 'widget']);

export const isPrintable = (block) => !!block && !UNPRINTABLE.has(block.type);

/** Why a block cannot be printed, for a tooltip or a note; null when it can. */
export function unprintableReason(block) {
  if (!block || isPrintable(block)) return null;
  return block.type === 'widget'
    ? 'A nested widget lives in its own frame and cannot be printed from here.'
    : 'An embedded frame cannot be printed from here.';
}
