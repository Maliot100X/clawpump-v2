// Pump.fun-style bonding curve, RE-DENOMINATED in CLAW instead of SOL.
//
// Original pump.fun (SOL-quoted) constants:
//   virtualSolReserves₀   = 30 SOL
//   virtualTokenReserves₀ = 1,073,000,191 tokens
//   realTokenReserves₀    = 793,100,000 tokens (the 800M sell side)
//   graduation trigger    = 85 SOL collected in real reserves
//   k                     = virtualSol × virtualToken (constant product)
//
// CLAW-quoted version: we scale every SOL number by (1 / priceClawInSol),
// where priceClawInSol = CLAW/SOL spot from Dexscreener. So if CLAW is
// 0.003087 SOL each, then graduation needs:
//   85 SOL / 0.003087 SOL/CLAW = ~27,535 CLAW
// (Earlier rough math gave ~1.8M; that was using a different priceNative
// reading. The function is what matters — UI calls it with live spot.)

export const PUMPFUN_SOL = {
  virtualSolReserves: 30,
  virtualTokenReserves: 1_073_000_191,
  realTokenReserves: 793_100_000,
  graduationSol: 85,
} as const;

export interface CurveState {
  // Live spot from Dexscreener at the moment we computed this curve.
  priceClawInSol: number;
  // Scaled reserves at curve creation.
  virtualClawReserves: number;
  virtualTokenReserves: number;
  realTokenReserves: number;
  // The CLAW amount the curve must collect to graduate to DAMM.
  graduationClaw: number;
  // Constant product invariant (virtualClaw × virtualToken at t=0).
  k: number;
}

export function buildCurve(priceClawInSol: number): CurveState {
  if (!Number.isFinite(priceClawInSol) || priceClawInSol <= 0) {
    throw new Error(`Invalid priceClawInSol: ${priceClawInSol}`);
  }
  const inv = 1 / priceClawInSol; // CLAW per SOL
  const virtualClawReserves = PUMPFUN_SOL.virtualSolReserves * inv;
  return {
    priceClawInSol,
    virtualClawReserves,
    virtualTokenReserves: PUMPFUN_SOL.virtualTokenReserves,
    realTokenReserves: PUMPFUN_SOL.realTokenReserves,
    graduationClaw: PUMPFUN_SOL.graduationSol * inv,
    k: virtualClawReserves * PUMPFUN_SOL.virtualTokenReserves,
  };
}

// Instantaneous spot price (CLAW per token), given the current virtual reserves.
export function spotPrice(vClaw: number, vTok: number): number {
  return vClaw / vTok;
}

// Constant-product swap: user puts in `clawIn` CLAW, gets `tokensOut` tokens.
//   (vClaw + clawIn) × (vTok - tokensOut) = k
//   tokensOut = vTok - k / (vClaw + clawIn)
export function tokensOut(
  vClaw: number,
  vTok: number,
  clawIn: number,
): { tokensOut: number; newVClaw: number; newVTok: number; avgPrice: number } {
  const k = vClaw * vTok;
  const newVClaw = vClaw + clawIn;
  const newVTok = k / newVClaw;
  const out = vTok - newVTok;
  return {
    tokensOut: out,
    newVClaw,
    newVTok,
    avgPrice: out > 0 ? clawIn / out : 0,
  };
}

// Reverse: user sells `tokensIn` tokens, gets `clawOut` CLAW.
export function clawOut(
  vClaw: number,
  vTok: number,
  tokensIn: number,
): { clawOut: number; newVClaw: number; newVTok: number; avgPrice: number } {
  const k = vClaw * vTok;
  const newVTok = vTok + tokensIn;
  const newVClaw = k / newVTok;
  const out = vClaw - newVClaw;
  return {
    clawOut: out,
    newVClaw,
    newVTok,
    avgPrice: tokensIn > 0 ? out / tokensIn : 0,
  };
}

// Progress toward graduation. clawCollected is the real CLAW the curve has taken in.
export function progressPct(clawCollected: number, graduationClaw: number): number {
  if (graduationClaw <= 0) return 0;
  return Math.min(100, Math.max(0, (clawCollected / graduationClaw) * 100));
}

// USD denominations are useful for the UI. Pass CLAW price in USD (from Dexscreener priceUsd).
export function clawToUsd(claw: number, priceClawUsd: number): number {
  return claw * priceClawUsd;
}
