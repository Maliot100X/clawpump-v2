#!/usr/bin/env node
import BN from 'bn.js';
import bs58mod from 'bs58';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  PUMP_SDK,
  OnlinePumpSdk,
  getBuyTokenAmountFromSolAmount,
  getSellSolAmountFromTokenAmount,
  bondingCurvePda,
} from '@pump-fun/pump-sdk';
import { buildAndPartialSignTx as buildCreateTx } from './scripts/lib/tx-build.mjs';
import { CREATE_AND_BUY_COMPUTE_UNITS, ALT_ADDRESS_MAINNET } from './scripts/lib/constants.mjs';
import { buildAndPartialSignTx as buildSwapTx } from '../swap/scripts/lib/tx-build.mjs';
import { BUY_SELL_DEFAULT_UNITS } from '../swap/scripts/lib/constants.mjs';
import { tokenProgramIdFromMint } from '../swap/scripts/lib/coin-resolve.mjs';

const bs58 = bs58mod.default || bs58mod;
const JITO_ENDPOINTS = [
  'https://mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions',
];
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function keypairFromSecret(s){ s=s.trim(); if(s.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s))); return Keypair.fromSecretKey(bs58.decode(s)); }
async function sendJito(txBase64){
  const body=JSON.stringify({jsonrpc:'2.0',id:1,method:'sendTransaction',params:[txBase64,{encoding:'base64'}]});
  const attempts=await Promise.allSettled(JITO_ENDPOINTS.map(async url=>{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
    const txt=await r.text();
    if(!r.ok) throw new Error(`${url} ${r.status}: ${txt}`);
    const data=JSON.parse(txt); if(data.error) throw new Error(`${url}: ${JSON.stringify(data.error)}`);
    return {url,data};
  }));
  const ok=attempts.find(a=>a.status==='fulfilled');
  if(ok) return ok.value;
  throw new Error('All Jito sends failed: '+attempts.map(a=>a.reason?.message).join(' | '));
}
async function fetchCoin(mint){
  try{
    const r=await fetch(`https://frontend-api-v3.pump.fun/coins-v2/${mint}`, {headers:{'User-Agent':'Mozilla/5.0'}});
    if(!r.ok) return null;
    return await r.json();
  }catch{return null;}
}
async function getTokenBalanceRaw(connection, owner, mint, tokenProgram){
  const ata=getAssociatedTokenAddressSync(mint, owner, false, tokenProgram);
  const bal=await connection.getTokenAccountBalance(ata).catch(()=>null);
  return bal?.value?.amount ? new BN(bal.value.amount) : new BN(0);
}
async function buildAndSendSellAll({connection,buyer,mint,onlineSdk,global,feeConfig,tipSol,priorityMicroLamports}){
  const tokenProgram=await tokenProgramIdFromMint(connection, mint);
  let amount=new BN(0);
  for(let i=0;i<10;i++){
    amount=await getTokenBalanceRaw(connection,buyer.publicKey,mint,tokenProgram);
    if(amount.gt(new BN(0))) break;
    await sleep(500);
  }
  if(amount.lte(new BN(0))) throw new Error('No token balance found to sell');
  const bondingCurveAddress=bondingCurvePda(mint);
  const [bondingCurveAccountInfo]=await connection.getMultipleAccountsInfo([bondingCurveAddress]);
  if(!bondingCurveAccountInfo) throw new Error('Bonding curve account not found');
  const bondingCurve=PUMP_SDK.decodeBondingCurve(bondingCurveAccountInfo);
  if(bondingCurve.complete) throw new Error('Bonding curve complete; AMM sell not implemented in this fast bot');
  const solAmount=getSellSolAmountFromTokenAmount({global,feeConfig,mintSupply:bondingCurve.tokenTotalSupply,bondingCurve,amount});
  const sellIxs=await PUMP_SDK.sellInstructions({
    global,bondingCurveAccountInfo,bondingCurve,mint,user:buyer.publicKey,
    amount,solAmount,slippage:30,tokenProgram,
    mayhemMode:bondingCurve.isMayhemMode ?? false,
    cashback:bondingCurve.isCashbackCoin ?? false,
  });
  const tx=await buildSwapTx({
    connection,payerKey:buyer.publicKey,sdkInstructions:sellIxs,
    computeUnits:BUY_SELL_DEFAULT_UNITS,priorityFeeMicroLamports:priorityMicroLamports,
    frontRunnerProtection:true,tipSol,
  });
  tx.sign([buyer]);
  const txBase64=Buffer.from(tx.serialize()).toString('base64');
  const sent=await sendJito(txBase64);
  return {tokenAmount:amount.toString(),quoteSolLamports:solAmount.toString(),signature:sent.data.result,jitoEndpoint:sent.url};
}
async function main(){
  const rpcUrl=process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection=new Connection(rpcUrl,'confirmed');
  const buyer=keypairFromSecret(process.env.BUYER_PRIVATE_KEY);
  const name=process.env.NAME || 'World Cup Coin War';
  const symbol=process.env.SYMBOL || 'WAR';
  const metadataUri=process.env.METADATA_URI || 'https://vpulse.duckdns.org/world-cup-coin-war.json';
  const buyLamports=Number(process.env.BUY_LAMPORTS || '90000000');
  const tipSol=Number(process.env.TIP_SOL || '0.0005');
  const priorityMicroLamports=Number(process.env.PRIORITY_MICRO_LAMPORTS || '500000');
  const watchMs=Number(process.env.WATCH_MS || '120000');
  console.error('Buyer:',buyer.publicKey.toBase58());
  console.error('Balance SOL:',(await connection.getBalance(buyer.publicKey))/1e9);
  const onlineSdk=new OnlinePumpSdk(connection);
  const [global,feeConfig]=await Promise.all([onlineSdk.fetchGlobal(),onlineSdk.fetchFeeConfig()]);
  let alts=[]; try{const alt=await connection.getAddressLookupTable(new PublicKey(ALT_ADDRESS_MAINNET)); if(alt.value) alts=[alt.value];}catch{}
  const mintKp=Keypair.generate(); const mint=mintKp.publicKey;
  const solAmount=new BN(buyLamports);
  const tokenAmount=getBuyTokenAmountFromSolAmount({global,feeConfig,mintSupply:null,bondingCurve:null,amount:solAmount});
  const createIxs=await PUMP_SDK.createV2AndBuyInstructions({global,mint,name,symbol,uri:metadataUri,creator:buyer.publicKey,user:buyer.publicKey,amount:tokenAmount,solAmount,mayhemMode:false,cashback:false});
  const createTx=await buildCreateTx({connection,payerKey:buyer.publicKey,sdkInstructions:createIxs,computeUnits:CREATE_AND_BUY_COMPUTE_UNITS,priorityFeeMicroLamports:priorityMicroLamports,extraSigners:[mintKp],addressLookupTableAccounts:alts,frontRunnerProtection:true,tipSol});
  createTx.sign([buyer]);
  const createBase64=Buffer.from(createTx.serialize()).toString('base64');
  console.error('Launching mint:',mint.toBase58());
  const launchSent=await sendJito(createBase64);
  const launchSig=launchSent.data.result;
  console.log(JSON.stringify({event:'launch_sent',mint:mint.toBase58(),signature:launchSig,pumpUrl:`https://pump.fun/coin/${mint.toBase58()}`,solscan:`https://solscan.io/tx/${launchSig}`},null,2));
  // Baseline after launch confirms/appears. We treat any last_trade_timestamp change or reply/trade metric movement after baseline as external activity.
  let baseline=null;
  for(let i=0;i<20;i++){
    baseline=await fetchCoin(mint.toBase58());
    if(baseline) break;
    await sleep(1000);
  }
  const baseTradeTs=Number(baseline?.last_trade_timestamp || 0);
  const baseReply=Number(baseline?.reply_count || 0);
  console.error('Baseline coin data:', JSON.stringify({last_trade_timestamp:baseTradeTs,reply_count:baseReply,complete:baseline?.complete}));
  const start=Date.now();
  while(Date.now()-start < watchMs){
    await sleep(1000);
    const c=await fetchCoin(mint.toBase58());
    if(!c){ console.error('poll: no coin data'); continue; }
    const ts=Number(c.last_trade_timestamp || 0);
    const reply=Number(c.reply_count || 0);
    console.error('poll', new Date().toISOString(), 'last_trade_timestamp', ts, 'reply_count', reply);
    if((baseTradeTs && ts > baseTradeTs) || (!baseTradeTs && ts) || reply > baseReply){
      console.error('External activity detected. Selling all tokens now...');
      const sell=await buildAndSendSellAll({connection,buyer,mint,onlineSdk,global,feeConfig,tipSol,priorityMicroLamports});
      console.log(JSON.stringify({event:'sell_sent',mint:mint.toBase58(),...sell,solscan:`https://solscan.io/tx/${sell.signature}`},null,2));
      return;
    }
  }
  console.log(JSON.stringify({event:'watch_timeout',mint:mint.toBase58(),seconds:watchMs/1000,pumpUrl:`https://pump.fun/coin/${mint.toBase58()}`},null,2));
}
main().catch(e=>{console.error(e.stack||e.message||e);process.exit(1);});
