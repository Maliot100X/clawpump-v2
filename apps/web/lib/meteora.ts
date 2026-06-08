// CLAW-quoted Meteora Dynamic Bonding Curve helpers.
//
// One source of truth for the on-chain curve parameters used by every
// CLAW-quoted token. Spreading those numbers across multiple routes invites
// drift; one helper keeps the curve identical across launch, swap, and pool
// reads.
//
// Exported surface:
//   - getDbcClient / getConnection   shared lazy singletons
//   - buildClawCurveConfig           ConfigParameters used by createConfigAndPool
//   - buildLaunchTransaction         build + pre-sign create-config-and-pool tx
//   - quoteSwap / buildSwapTransaction   used by /api/swap & /api/swap/quote
//   - readPoolState                  used by /api/pool/[address]
//
// Defaults are deliberate:
//   - Quote = CLAW (the entire point of this launchpad).
//   - Base decimals 6 — matches CLAW, matches pump.fun, fits in u64 cleanly.
//   - Migration target = DAMM v2 (Meteora's current recommended path).
//   - Pool creation fee = 0 (free-tier promise).
//   - User is poolCreator + fee_claimer (no platform relayer yet → all fees
//     flow to the launcher). Flipping this to a platform pubkey is a one-line
//     change later.

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DammV2BaseFeeMode,
  DammV2DynamicFeeMode,
  DynamicBondingCurveClient,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  SwapMode,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  buildCurveWithMarketCap,
  deriveDbcPoolAddress,
  type ConfigParameters,
  type SwapQuote2Result,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

// --- shared client ---------------------------------------------------------

const CLAW_MINT = new PublicKey(
  process.env.CLAW_MINT ?? "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump",
);

// HELIUS_RPC (keyed, fast, archival) is preferred on the server. The public
// RPC is rate-limited and unreliable for read-heavy state calls.
function getRpcUrl(): string {
  return (
    process.env.HELIUS_RPC ||
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    "https://api.mainnet-beta.solana.com"
  );
}

let _client: DynamicBondingCurveClient | null = null;
let _conn: Connection | null = null;

export function getDbcClient(): DynamicBondingCurveClient {
  if (_client) return _client;
  _conn = new Connection(getRpcUrl(), "confirmed");
  _client = DynamicBondingCurveClient.create(_conn, "confirmed");
  return _client;
}

export function getConnection(): Connection {
  if (_conn) return _conn;
  _conn = new Connection(getRpcUrl(), "confirmed");
  return _conn;
}

// --- curve config ---------------------------------------------------------

export interface ClawCurveOpts {
  baseDecimals?: TokenDecimal;
  initialMarketCapClaw?: number;
  migrationMarketCapClaw?: number;
  totalTokenSupply?: number;
}

const CLAW_DECIMALS: TokenDecimal = TokenDecimal.SIX;

/**
 * Build the `ConfigParameters` used by `createConfigAndPool`.
 *
 * `buildCurveWithMarketCap` is used because market-cap is the only number a
 * launcher actually understands. Everything else (sqrt prices, liquidity
 * weights) is derived from the two anchor points + curve shape.
 */
export function buildClawCurveConfig(
  opts: ClawCurveOpts = {},
): ConfigParameters {
  const baseDecimals = opts.baseDecimals ?? TokenDecimal.SIX;
  const initialMarketCap = opts.initialMarketCapClaw ?? 1_000; // 1k CLAW
  const migrationMarketCap = opts.migrationMarketCapClaw ?? 100_000; // 100k CLAW
  const totalTokenSupply = opts.totalTokenSupply ?? 1_000_000_000; // 1B tokens

  return buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: baseDecimals,
      tokenQuoteDecimal: CLAW_DECIMALS,
      // Immutable = remove both mint + freeze authority on day one. Standard
      // for a fair-launch meme: nobody (not even the launcher) can mint more.
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          // Flat 25bps (0.25% — Meteora minimum). startingFee == endingFee
          // with 0 periods = constant fee, no schedule.
          startingFeeBps: 25,
          endingFeeBps: 25,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      // 100% of trading fees go to the creator (launcher == user for now).
      // Drop this to e.g. 50 once a platform relayer collects partner fees.
      creatorTradingFeePercentage: 100,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100, // 1% migration fee
      migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
      },
      migratedPoolFee: {
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        poolFeeBps: 100,
        baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
        compoundingFeeBps: 0,
      },
    },
    liquidityDistribution: {
      // 20% permanent-locked LP from creator side, 80% creator-owned (vests
      // immediately after migration). Permanent-lock ≥ 10% is required.
      partnerPermanentLockedLiquidityPercentage: 0,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 20,
      creatorLiquidityPercentage: 80,
    },
    lockedVesting: {
      // No pre-migration vesting — meme launches are fair / liquid out of gate.
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap,
    migrationMarketCap,
  });
}

// --- launch ---------------------------------------------------------------

export interface LaunchInput {
  name: string;
  symbol: string;
  uri: string; // off-chain Metaplex JSON
  payer: PublicKey; // pays rent + tx fees
  poolCreator: PublicKey; // gets creator trading fees (usually == payer)
  feeClaimer?: PublicKey; // gets partner trading fees (defaults to creator)
  curveOpts?: ClawCurveOpts;
}

export interface LaunchTxBundle {
  txBase64: string;
  configPubkey: string;
  baseMintPubkey: string;
  poolPubkey: string;
}

/**
 * Build a fully-formed `createConfigAndPool` transaction.
 *
 * The browser-side wallet is the final signer; ephemeral config + baseMint
 * keypairs are pre-signed server-side (the SDK requires them as account
 * signers). Returns a base64 wire-format tx; the browser deserializes, asks
 * Phantom for its signature, then submits.
 */
export async function buildLaunchTransaction(
  input: LaunchInput,
): Promise<LaunchTxBundle> {
  const client = getDbcClient();
  const conn = getConnection();

  // Ephemeral keypairs — config + mint addresses are random per launch and
  // must sign the tx. They never live past this request.
  const configKeypair = Keypair.generate();
  const baseMintKeypair = Keypair.generate();

  const curve = buildClawCurveConfig(input.curveOpts);
  const feeClaimer = input.feeClaimer ?? input.poolCreator;

  // `partner.createConfigAndPool` builds one tx that creates the per-launch
  // config account AND initializes the pool against it. User signs once.
  const tx: Transaction = await client.partner.createConfigAndPool({
    config: configKeypair.publicKey,
    feeClaimer,
    leftoverReceiver: feeClaimer,
    quoteMint: CLAW_MINT,
    payer: input.payer,
    ...curve,
    preCreatePoolParam: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri,
      poolCreator: input.poolCreator,
      baseMint: baseMintKeypair.publicKey,
    },
  });

  // Stamp blockhash + payer so the browser can sign + send without round-tripping.
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = input.payer;

  // Pre-sign with ephemeral keypairs. `partialSign` keeps Phantom's slot open.
  tx.partialSign(configKeypair, baseMintKeypair);

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const poolPubkey = deriveDbcPoolAddress(
    CLAW_MINT,
    baseMintKeypair.publicKey,
    configKeypair.publicKey,
  );

  return {
    txBase64: serialized.toString("base64"),
    configPubkey: configKeypair.publicKey.toBase58(),
    baseMintPubkey: baseMintKeypair.publicKey.toBase58(),
    poolPubkey: poolPubkey.toBase58(),
  };
}

// --- swap -----------------------------------------------------------------

export interface SwapInput {
  pool: PublicKey;
  owner: PublicKey; // wallet doing the swap
  amountIn: bigint;
  minimumAmountOut: bigint;
  swapBaseForQuote: boolean; // true = sell base→CLAW, false = buy CLAW→base
}

export interface SwapTxBundle {
  txBase64: string;
}

export async function buildSwapTransaction(
  input: SwapInput,
): Promise<SwapTxBundle> {
  const client = getDbcClient();
  const conn = getConnection();

  const tx: Transaction = await client.pool.swap2({
    pool: input.pool,
    owner: input.owner,
    amountIn: new BN(input.amountIn.toString()),
    minimumAmountOut: new BN(input.minimumAmountOut.toString()),
    swapBaseForQuote: input.swapBaseForQuote,
    swapMode: SwapMode.ExactIn,
    referralTokenAccount: null,
  });

  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = input.owner;

  return {
    txBase64: tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
  };
}

export interface QuoteInput {
  pool: PublicKey;
  amountIn: bigint;
  swapBaseForQuote: boolean;
  slippageBps?: number; // default 100 = 1%
}

export interface QuoteResult {
  amountIn: string;
  amountOut: string;
  minimumAmountOut: string;
  feeAmount: string;
}

/**
 * Pure quote — no transaction is built. Used by the frontend to render the
 * "you'll get ~X tokens for Y CLAW" preview before the user clicks buy.
 */
export async function quoteSwap(input: QuoteInput): Promise<QuoteResult> {
  const client = getDbcClient();
  const slippageBps = input.slippageBps ?? 100;

  const virtualPool = await client.state.getPool(input.pool);
  if (!virtualPool) throw new Error(`pool not found: ${input.pool.toBase58()}`);
  const configState = await client.state.getPoolConfig(
    virtualPool.poolState.config,
  );
  if (!configState) throw new Error("pool config not found");

  const quote: SwapQuote2Result = client.pool.swapQuote2({
    virtualPool,
    config: configState,
    swapBaseForQuote: input.swapBaseForQuote,
    swapMode: SwapMode.ExactIn,
    amountIn: new BN(input.amountIn.toString()),
    slippageBps,
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint: new BN(Math.floor(Date.now() / 1000)),
  });

  const outputAmount = new BN(quote.outputAmount.toString());
  // SDK gives us minimumAmountOut already when slippageBps is provided; if
  // for some reason it didn't, derive it here so callers always get a value.
  const minOut =
    quote.minimumAmountOut ?? outputAmount.muln(10_000 - slippageBps).divn(10_000);

  return {
    amountIn: input.amountIn.toString(),
    amountOut: outputAmount.toString(),
    minimumAmountOut: minOut.toString(),
    feeAmount: quote.tradingFee?.toString() ?? "0",
  };
}

// --- pool state read ------------------------------------------------------

export interface PoolStateSnapshot {
  pool: string;
  config: string;
  baseMint: string;
  quoteMint: string;
  isMigrated: boolean;
  baseReserve: string;
  quoteReserve: string;
  migrationQuoteThreshold: string;
  progressPct: number;
}

export async function readPoolState(
  poolPubkey: PublicKey,
): Promise<PoolStateSnapshot | null> {
  const client = getDbcClient();
  const virtualPool = await client.state.getPool(poolPubkey);
  if (!virtualPool) return null;
  const configState = await client.state.getPoolConfig(
    virtualPool.poolState.config,
  );
  if (!configState) return null;

  const quoteReserve = new BN(virtualPool.poolState.quoteReserve.toString());
  const threshold = new BN(configState.migrationQuoteThreshold.toString());
  const progress = threshold.isZero()
    ? 0
    : Math.min(
        100,
        Number(quoteReserve.muln(10000).div(threshold).toString()) / 100,
      );

  return {
    pool: poolPubkey.toBase58(),
    config: virtualPool.poolState.config.toBase58(),
    baseMint: virtualPool.poolState.baseMint.toBase58(),
    quoteMint: configState.quoteMint.toBase58(),
    isMigrated: virtualPool.poolState.isMigrated === 1,
    baseReserve: virtualPool.poolState.baseReserve.toString(),
    quoteReserve: quoteReserve.toString(),
    migrationQuoteThreshold: threshold.toString(),
    progressPct: progress,
  };
}

export { CLAW_MINT };
