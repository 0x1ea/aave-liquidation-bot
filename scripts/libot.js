require("dotenv").config();
const config = require("../config/config.json");
const { zapLiquidator } = require("./zapLiquidator");

/**
 * Verificar estos valores antes de ejecutar el script
 */
const CHAIN = "mainnet";
const PUBLIC_PROVIDER_URL = config.rpcUrl[CHAIN].local;
const PROVIDER_URL = config.rpcUrl[CHAIN].local;
const MY_ACCOUNT = config.keys.fake;

const MIN_ACCOUNT_RESERVE = "0.07";
const FOLDER_NAME = `${CHAIN}_v2`;
const INPUT_FILE_NAME = "users_ready";

async function bot() {
  const data = require(`../data/${FOLDER_NAME}/${INPUT_FILE_NAME}.json`);
  const end = data.length;

  return new Promise(async (resolve) => {
    for (let index = 0; index < end; index++) {
      const iEnd = data[index].userConfiguration.length;

      for (let i = 1; i < iEnd; i++) {
        if (data[index].userConfiguration[i].debt) {
          for (let j = 0; j < iEnd; j++) {
            if (data[index].userConfiguration[j].col) {
              try {
                let lastNonce = await zapLiquidator(
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
                console.log(error.code);
              }
            }
          }
        }
      }
    }

    resolve(true);
  });
}

console.log("Searching for:", CHAIN, "...");
async function botInterval() {
  await bot();
  botInterval();
}

botInterval();
