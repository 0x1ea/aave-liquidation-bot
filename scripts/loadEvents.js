const Web3 = require("web3");
const LendingPool = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const { updateBlocks } = require("../utils/updateBlocks");
const { saveData } = require("../utils/saveData");
require("dotenv").config();
const aave = require("../config/aave.json");
const config = require("../config/config.json");
const { createBlockData } = require("../utils/createBlockData");

/**
 * INFORMACION PARA CONFIGURAR
 * ANTES DE HACER EL LLAMADO
 */
const OUTPUT_FOLDER_NAME = "optimism_v3";
const INPUT_FILE_NAME = "blocks_2000";
const FROM_BLOCK = 35596;
const TO_BLOCK = 98552;
const EVENT_NAME = "Deposit";
const PROVIDER = config.rpcUrl.optimism.alchemy;
const CONTRACT_ADDRESS = aave.optimism.erc20.IWeth.address;
const CONTRACT_ABI = aave.optimism.erc20.IWeth.abi;

/**
 * ⚠  ⚠  ⚠
 * Para empezar a leer los eventos debes construir primero esta estructura de carpetas
 * /[folderName]
 *   /events
 *   /users
 *   /uniqueUsers
 *   index.json -> with "[]" inside
 * ⚠  ⚠  ⚠
 * @param {string} provider nombre de la variable de entorno donde esta el provider
 * @param {string} folderName nombre de la carpeta donde se actualizar los archivos
 * @param {string} fileName nombre del archivo que se va actualizar
 * @param {stirng} eventName nombre del evento a pedir. CASE SENSITIVE
 */
async function loadEvents(providerRpc, folderName, fileName, eventName) {
  const blocks = require(`../${folderName}/${fileName}.json`);
  const EVENT = eventName || "Deposit";
  const provider = process.env[providerRpc];
  const web3 = new Web3(provider);

  const LendingPoolAddress = CONTRACT_ADDRESS;
  const contract = new web3.eth.Contract(CONTRACT_ABI, LendingPoolAddress);

  /**
   * Verifico la cantidad de steps para leer toda la blockchain
   * La maxima cantidad de bloques que se pueden llamar a la vez son 2000
   * Los steps son de 2000 bloques desde el lanzamiento del SC hasta el
   * bloque mas actual
   */
  const calls = blocks.length;

  /**
   * Comienzo a iterar por todo el array de blocks_2000
   */
  for (let i = 0; i <= calls; i++) {
    if (blocks[i].saved == false) {
      let j = i;

      /**
       * La máxima cantidad de data que caben por archivo parecen ser 100 peticiones
       * en un rango de 2000 bloques.
       */
      const end = j + 100;

      while (j < end) {
        /**
         * Extraigo todos los eventos en un rango de 2000 bloques
         */
        const events = await contract.getPastEvents(EVENT, {
          fromBlock: blocks[j].fromBlock,
          toBlock: blocks[j].toBlock
        });

        await saveData(folderName, `events/${i}`, events);
        await updateBlocks(folderName, fileName, j);
        j++;
      }
      i = j - 1;
    }
  }
  console.log(`Events written successfully!`);
}

module.exports = { loadEvents };

// createBlockData(OUTPUT_FOLDER_NAME, "blocks", 2000, FROM_BLOCK, TO_BLOCK);
loadEvents(PROVIDER, OUTPUT_FOLDER_NAME, INPUT_FILE_NAME, EVENT_NAME);
