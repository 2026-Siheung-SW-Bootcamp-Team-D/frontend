import { bottomSheetLabel, toggleBottomSheet } from "../features/bottomSheet/bottomSheetModel";

export function MobileSheetHandle({ expanded, onChange }) {
  return <button
    type="button"
    className="flex min-h-11 w-full touch-manipulation items-center justify-center lg:hidden"
    aria-expanded={expanded}
    aria-label={bottomSheetLabel(expanded)}
    onClick={() => onChange(toggleBottomSheet(expanded))}
  >
    <span className="h-1.5 w-12 rounded-full bg-line" />
  </button>;
}
