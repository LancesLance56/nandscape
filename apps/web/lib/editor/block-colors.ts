 export const DEFAULT_BLOCK_COLORS: readonly string[] = [
   "#5B8DEF", // blue
   "#4CAF7D", // green
   "#E0A339", // amber
   "#D9694F", // coral
   "#9B6BD8", // violet
   "#3FB6C7", // teal
   "#E05C97", // pink
   "#8C8C8C", // neutral gray
 ];

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}