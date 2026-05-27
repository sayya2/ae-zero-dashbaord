// Selling prices (incl. 8% GST) in MVR
// Source: "May 19 On Grid upto 90kwp.xlsx" — 20ft FCL freight
const PRICING_20FT: Record<number, number> = {
  3: 54703, 5: 68795, 9: 113007, 10: 120000, 13: 156682,
  15: 185000, 20: 252427, 25: 305000, 30: 357453, 35: 420000,
  40: 480000, 45: 545000, 50: 610415, 55: 695000, 60: 790180,
  65: 850000, 70: 900000, 75: 946033, 80: 1000000, 85: 1060000, 90: 1122871,
};

// Source: "40 feet final april 8 calc.xlsx" — available for 3–30 kWp only
const PRICING_40FT: Record<number, number> = {
  3: 49820, 5: 66246, 8: 101444, 10: 130767,
  15: 198282, 20: 250139, 25: 310342, 30: 346804,
};

function interpolate(kwp: number, table: Record<number, number>): number {
  if (table[kwp] !== undefined) return table[kwp];
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (kwp <= keys[0]) return table[keys[0]];
  if (kwp >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  const lo = keys.filter((k) => k <= kwp).pop()!;
  const hi = keys.find((k) => k > kwp)!;
  return Math.round(table[lo] + ((kwp - lo) / (hi - lo)) * (table[hi] - table[lo]));
}

export function getAvailableFreightTypes(kwp: number): ("20ft" | "40ft")[] {
  return kwp <= 30 ? ["20ft", "40ft"] : ["20ft"];
}

export function getPriceBreakdown(kwp: number, freightType: "20ft" | "40ft") {
  if (freightType === "40ft" && kwp > 30)
    throw new Error("40ft FCL only available up to 30 kWp");
  const table = freightType === "40ft" ? PRICING_40FT : PRICING_20FT;
  const totalInclGst = interpolate(kwp, table);
  const gstAmount = Math.round((totalInclGst / 1.08) * 0.08);
  return {
    kwp,
    freightType,
    totalExclGst: totalInclGst - gstAmount,
    gstAmount,
    totalInclGst,
    perKwpPrice: Math.round(totalInclGst / kwp),
  };
}
