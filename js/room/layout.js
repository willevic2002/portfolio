// Pure shelf layout (metres). Shelf is 1.9 m wide, centred on x = SHELF_CENTER_X.
export const SHELF_WIDTH = 1.9;
export const SHELF_CENTER_X = -0.1;
export const SHELF_BASE_Y = 1.35;
export const ROW_PITCH = 0.5;
const MAX_PER_ROW = 6;

/** Returns row count and one slot per item; slot.y is the top surface of its board. */
export function layoutShelf(n) {
  const count = Math.max(0, Math.floor(n));
  const rows = Math.max(1, Math.ceil(count / MAX_PER_ROW));
  const left = SHELF_CENTER_X - SHELF_WIDTH / 2;
  const slots = [];
  let placed = 0;
  for (let row = 0; row < rows; row++) {
    const inRow = Math.min(Math.ceil(count / rows), count - placed);
    for (let i = 0; i < inRow; i++) {
      slots.push({ row, x: left + (SHELF_WIDTH * (i + 0.5)) / inRow, y: SHELF_BASE_Y + ROW_PITCH * row });
    }
    placed += inRow;
  }
  return { rows, slots };
}
