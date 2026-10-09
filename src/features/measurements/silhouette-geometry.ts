import type { Zone } from "@/lib/metrics";

export type Sex = "male" | "female";

/** Widened from "0 0 200 440" to leave room for the labels (specs/06 §5.1). */
export const VIEW_BOX = "-80 0 360 440";
export const VIEW_BOX_X = -80;
export const VIEW_BOX_WIDTH = 360;
export const VIEW_BOX_HEIGHT = 440;

/** Right half of the outline; the left one is its mirror (translate(200,0) scale(-1,1)). From specs/maquettes/silhouette-concepts.html. */
export const HALF_PATH: Record<Sex, string> = {
  male: "M100,62 L110,62 Q111,72 112,76 Q140,80 150,94 Q157,108 158,130 L162,170 Q165,200 166,222 Q170,238 164,248 Q156,250 156,236 L152,205 Q148,175 146,150 L140,122 Q136,150 132,172 Q128,190 131,208 Q136,225 134,245 L130,300 Q127,320 128,335 L124,395 L123,412 Q130,420 128,426 L106,426 L107,412 L106,390 L106,335 Q104,300 103,270 Q101,252 100,250",
  female:
    "M100,62 L108,62 Q109,72 110,76 Q132,80 140,94 Q146,108 147,130 L151,170 Q154,200 155,222 Q159,238 153,248 Q146,250 146,236 L142,205 Q138,175 136,150 L132,124 Q134,145 130,160 Q124,176 124,188 Q127,210 137,230 Q140,245 136,262 L130,305 Q127,322 128,337 L122,395 L121,412 Q127,420 125,426 L105,426 L106,412 L105,390 L105,337 Q103,300 102,275 Q101,262 100,260",
};

export const HEAD: Record<Sex, { cx: number; cy: number; rx: number; ry: number }> = {
  male: { cx: 100, cy: 40, rx: 22, ry: 22 },
  female: { cx: 100, cy: 40, rx: 20, ry: 23 },
};

/** specs/06 §5.2. */
export const ANCHORS: Record<Sex, Record<Zone, { x: number; y: number }>> = {
  male: {
    neck: { x: 100, y: 70 },
    shoulders: { x: 145, y: 90 },
    chest: { x: 100, y: 130 },
    arm: { x: 153, y: 140 },
    waist: { x: 100, y: 180 },
    hips: { x: 100, y: 220 },
    thigh: { x: 118, y: 280 },
    calf: { x: 116, y: 360 },
  },
  female: {
    neck: { x: 100, y: 70 },
    shoulders: { x: 135, y: 90 },
    chest: { x: 100, y: 135 },
    arm: { x: 144, y: 140 },
    waist: { x: 100, y: 185 },
    hips: { x: 100, y: 228 },
    thigh: { x: 117, y: 285 },
    calf: { x: 115, y: 360 },
  },
};

export const LABEL_SIDE: Record<Zone, "left" | "right"> = {
  neck: "left",
  chest: "left",
  waist: "left",
  hips: "left",
  shoulders: "right",
  arm: "right",
  thigh: "right",
  calf: "right",
};

/**
 * Horizontal extent of the highlight bar of the guided session, read off the outline at the
 * height of each zone (specs/06 §5.2: "largeur ajustée au corps à cette hauteur").
 * Checked by eye against the mock-up in task 7, step 6.
 */
export const BAND: Record<Sex, Record<Zone, { x1: number; x2: number }>> = {
  male: {
    neck: { x1: 88, x2: 112 },
    shoulders: { x1: 50, x2: 150 },
    chest: { x1: 44, x2: 156 },
    arm: { x1: 42, x2: 158 },
    waist: { x1: 52, x2: 148 },
    hips: { x1: 36, x2: 164 },
    thigh: { x1: 70, x2: 130 },
    calf: { x1: 72, x2: 128 },
  },
  female: {
    neck: { x1: 90, x2: 110 },
    shoulders: { x1: 60, x2: 140 },
    chest: { x1: 54, x2: 146 },
    arm: { x1: 52, x2: 148 },
    waist: { x1: 64, x2: 136 },
    hips: { x1: 44, x2: 156 },
    thigh: { x1: 70, x2: 130 },
    calf: { x1: 72, x2: 128 },
  },
};
