#!/usr/bin/env node
import BN from 'bn.js';
import { Keypair, PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { PUMP_SDK, OnlinePumpSdk, getBuyTokenAmountFromSolAmount } from '@pump-fun/pump-sdk';
import { buildAndPartialSignTx, transactionToBase64 } from './scripts/lib/tx-build.mjs';
import { CREATE_AND_BUY_COMPUTE_UNITS, ALT_ADDRESS_MAINNET } from './scripts/lib/constants.mjs';
import bs58mod from 'bs58';

const bs58 = bs58mod.default || bs58mod;
const JITO_ENDPOINTS = [
  'https://mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions',
];

function keypairFromSecret(s) {
  s = s.trim();
  if (s.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
  return Keypair.fromSecretKey(bs58.decode(s));
}

async function sendJito(txBase64) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendTransaction', params: [txBase64, { encoding: 'base64' }] });
  const attempts = await Promise.allSettled(JITO_ENDPOINTS.map(async (url) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const txt = await r.text();
    if (!r.ok) throw new Error(`${url} ${r.status}: ${txt}`);
    const data = JSON.parse(txt);
    if (data.error) throw new Error(`${url}: ${JSON.stringify(data.error)}`);
    return { url, data };
  }));
  const ok = attempts.find(a => a.status === 'fulfilled');
  if (ok) return ok.value;
  throw new Error(attempts.map(a => a.reason?.message).join(' | '));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const buyer = keypairFromSecret(process.env.BUYER_PRIVATE_KEY);
  const user = buyer.publicKey;
  const name = process.env.NAME || 'World Cup Coin War';
  const symbol = process.env.SYMBOL || 'WAR';
  const metadataUri = process.env.METADATA_URI || 'https://vpulse.duckdns.org/world-cup-coin-war.json';
  const solLamports = Number(process.env.BUY_LAMPORTS || '90000000');
  const tipSol = Number(process.env.TIP_SOL || '0.0005');
  const priorityMicroLamports = Number(process.env.PRIORITY_MICRO_LAMPORTS || '500000');

  const bal = await connection.getBalance(user);
  console.error('Buyer:', user.toBase58());
  console.error('Balance SOL:', bal / 1e9);
  console.error('Name/Symbol:', name, symbol);
  console.error('Metadata:', metadataUri);
  console.error('Initial buy SOL:', solLamports / 1e9);

  const onlineSdk = new OnlinePumpSdk(connection);
  const [global, feeConfig] = await Promise.all([onlineSdk.fetchGlobal(), onlineSdk.fetchFeeConfig()]);

  let addressLookupTableAccounts = [];
  try {
    const alt = await connection.getAddressLookupTable(new PublicKey(ALT_ADDRESS_MAINNET));
    if (alt.value) addressLookupTableAccounts = [alt.value];
  } catch (e) {
    console.error('ALT lookup skipped:', e.message);
  }

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const solAmount = new BN(solLamports);
  const tokenAmount = getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount });

  const sdkInstructions = await PUMP_SDK.createV2AndBuyInstructions({
    global,
    mint,
    name,
    symbol,
    uri: metadataUri,
    creator: user,
    user,
    amount: tokenAmount,
    solAmount,
    mayhemMode: false,
    cashback: false,
  });

  console.error('Mint:', mint.toBase58());
  console.error('Building tx...');
  const tx = await buildAndPartialSignTx({
    connection,
    payerKey: user,
    sdkInstructions,
    computeUnits: CREATE_AND_BUY_COMPUTE_UNITS,
    priorityFeeMicroLamports: priorityMicroLamports,
    extraSigners: [mintKeypair],
    addressLookupTableAccounts,
    frontRunnerProtection: true,
    tipSol,
  });
  tx.sign([buyer]);
  const txBase64 = Buffer.from(tx.serialize()).toString('base64');
  console.error('Sending via Jito...');
  const sent = await sendJito(txBase64);
  const sig = sent.data.result;
  console.log(JSON.stringify({
    success: true,
    mint: mint.toBase58(),
    buyer: user.toBase58(),
    buySol: solLamports / 1e9,
    signature: sig,
    jitoEndpoint: sent.url,
    pumpUrl: `https://pump.fun/coin/${mint.toBase58()}`,
    solscan: `https://solscan.io/tx/${sig}`,
    metadataUri,
  }, null, 2));
}

main().catch(e => { console.error(e.stack || e.message || e); process.exit(1); });
