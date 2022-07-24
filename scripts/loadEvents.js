const Web3 = require("web3");
const LendingPool = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const { updateBlocks } = require("../utils/updateBlocks");
const { saveData } = require("../utils/saveData");
require("dotenv").config();
const aave = require("../constants/aave.json");
const config = require("../constants/config.json");
const { createBlockData } = require("../utils/createBlockData");
// ⚠ Recuerda actualizar este valor con los blocksSteps
// Funcion para crear o actualizar un nuevo archivo dentro de /data

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
async function loadEvents(provider, folderName, fileName, eventName) {
  const blocks = require(`../${folderName}/${fileName}.json`);
  const EVENT = eventName || "Deposit";
  const provider = process.env[provider];
  const web3 = new Web3(provider);

  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const LendingPoolAddress = aave.polygon.v3.pool.address;
  const contract = new web3.eth.Contract(aave.polygon.v3.pool.abi, LendingPoolAddress);

  /**
   * Verifico la cantidad de steps para leer toda la blockchain
   * La maxima cantidad de bloques que se pueden llamar a la vez son 2000
   * Los steps son de 2000 bloques desde el lanzamiento del SC hasta el
   * bloque mas actual
   */
  const calls = blocks.length;

  /**
   * El backup es porque se me quedo congelada la información en el archivo de 1000
   */
  // const backup = 6500;

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

// createBlockData("polygon_v3", "blocks", 2000, 25826028, 31062807);
// loadEvents(config.rpcUrl.polygon.alchemy, "polygon_v3", "blocks_2000", "Supply");
