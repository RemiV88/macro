// Module-level slot for transferring a USDA-picked food back to the
// new-food screen without duplicating it in the navigation stack.
let pending = null;

export function setPendingPick(food) {
  pending = food;
}

export function consumePendingPick() {
  const f = pending;
  pending = null;
  return f;
}
