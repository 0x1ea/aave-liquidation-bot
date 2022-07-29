require("dotenv").config();
const { ethers } = require("ethers");
const config = require("../config/config.json");
const { liquidate } = require("./liquidateV2");

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const CHAIN = "mainnet";
// const CHAIN = "polygon";
const PUBLIC_PROVIDER_URL = config.rpcUrl[CHAIN].local;
const PROVIDER_URL = config.rpcUrl[CHAIN].local;
const MY_ACCOUNT = config.keys.private;
const MIN_ACCOUNT_RESERVE = "0.05";

const FOLDER_NAME = `${CHAIN}_v2`;
const INPUT_FILE_NAME = "users_ready";

async function bot(nonce) {
  const data = require(`../data/${FOLDER_NAME}/${INPUT_FILE_NAME}.json`);
  const end = data.length;
  let NONCE = nonce;

  // console.log("nonce", NONCE);
  for (let index = 1; index < end; index++) {
    const iEnd = data[index].userConfiguration.length;

    for (let i = 1; i < iEnd; i++) {
      if (data[index].userConfiguration[i].debt) {
        for (let j = 0; j < iEnd; j++) {
          if (data[index].userConfiguration[j].col) {
            try {
              let lastNonce = await liquidate(
                data[index].user,
                data[index].userConfiguration[i].chainData,
                data[index].userConfiguration[j].chainData,
                PUBLIC_PROVIDER_URL,
                PROVIDER_URL,
                MY_ACCOUNT,
                CHAIN,
                MIN_ACCOUNT_RESERVE,
                NONCE
              );
              NONCE = lastNonce;
            } catch (error) {
              console.log(error);
              // let provider = new ethers.providers.JsonRpcProvider(
              //   process.env[PROVIDER_URL]
              // );
              // let deployer = new ethers.Wallet(process.env[MY_ACCOUNT], provider);
              // let nonce = await deployer.getTransactionCount();
              // NONCE = nonce;
              // console.log("Reloaded nonce: ", NONCE);
            }
          }
        }
      }
    }
  }
  return NONCE;
}

async function botInterval() {
  console.log("Searching MEV for:", CHAIN, "...");
  let provider = new ethers.providers.JsonRpcProvider(process.env[PROVIDER_URL]);
  let deployer = new ethers.Wallet(process.env[MY_ACCOUNT], provider);
  let nonce = await deployer.getTransactionCount();

  setInterval(async () => {
    const NONCE = await bot(nonce);
    nonce = NONCE;
  }, 500);
}

botInterval();
