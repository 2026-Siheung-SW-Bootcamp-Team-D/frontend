export function toggleBottomSheet(expanded) {
  return !expanded;
}

export function bottomSheetLabel(expanded) {
  return expanded ? "바텀시트 접기" : "바텀시트 펼치기";
}

export function bottomSheetMobileHeight(expanded, collapsedClass) {
  return expanded ? "max-h-[82dvh]" : collapsedClass;
}
