require("dotenv").config();
const { ethers } = require("ethers");
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const uniswap = require("../config/uniswap.json");
const { liquidate } = require("./liquidate");

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const CHAIN = "polygon";
const FOLDER_NAME = `${CHAIN}_v2`;
const INPUT_FILE_NAME = "users_ready";
const PUBLIC_PROVIDER_URL = config.rpcUrl[CHAIN].public;
const PROVIDER_URL = config.rpcUrl[CHAIN].alchemy;
const MY_ACCOUNT = config.keys.private;

async function bot() {
  const data = require(`../data/${FOLDER_NAME}/${INPUT_FILE_NAME}.json`);

  const end = data.length;

  for (let index = 1; index < end; index++) {
    const iEnd = data[index].userConfiguration.length;

    for (let i = 1; i < iEnd; i++) {
      if (data[index].userConfiguration[i].debt) {
        for (let j = 0; j < iEnd; j++) {
          if (data[index].userConfiguration[j].col) {
            try {
              await liquidate(
                data[index].user,
                data[index].userConfiguration[i].chainData,
                data[index].userConfiguration[j].chainData,
                PUBLIC_PROVIDER_URL,
                PROVIDER_URL,
                MY_ACCOUNT,
                CHAIN
              );
            } catch (error) {
              console.log(error);
            }
          }
        }
      }
    }
  }
}

console.log("Searching MEV for:", CHAIN, "...");

setInterval(async () => {
  await bot();
}, 5000);
