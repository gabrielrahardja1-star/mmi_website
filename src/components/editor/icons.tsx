import { ICON } from "./config";

export const Svg = ({ d, size = 18, w = 2 }: { d: string; size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} aria-hidden="true">
    <path d={d} />
  </svg>
);

// The small square icon in front of an item in the flyouts.
export const ItemIcon = ({ kind }: { kind: string }) => (
  <span className="ic">
    <Svg d={ICON[kind]} />
  </span>
);

export const PATHS = {
  add: "M12 5v14M5 12h14",
  page: "M6 3h9l4 4v14H6zM14 3v5h5",
  content: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  media: "M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6",
  desktop: "M3 4h18v12H3zM8 20h8M12 16v4",
  phone: "M7 2h10v20H7zM11 18h2",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  exit: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
  logout: "M10 4H5v16h5M14 8l4 4-4 4M18 12H9",
};
