const Web3 = require("web3");
require("dotenv").config();
const LendingPool = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const { updateBlocks } = require("../utils/updateBlocks");
// ⚠ Recuerda actualizar este valor con los blocksSteps
const blocks = require("../data/blocks_2000.json");
// Funcion para crear o actualizar un nuevo archivo dentro de /data
const { saveData } = require("../utils/saveData");

async function main() {
  const provider = process.env["FORK_RPC_URL"];
  const web3 = new Web3(provider);

  /**
   * LendingPool:
   * Mainnet: 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
   * Polygon: 0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf
   */
  const LendingPoolAddress = "0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf";
  const contract = new web3.eth.Contract(LendingPool.abi, LendingPoolAddress);

  /**
   * Verifico la cantidad de steps para leer toda la blockchain
   * La maxima cantidad de bloques que se pueden llamar a la vez son 2000
   * Los steps son de 2000 bloques desde el lanzamiento del SC hasta el
   * bloque mas actual
   */
  const calls = blocks.length;
  console.log(calls);

  /**
   * El backup es porque se me quedo congelada la información en el archivo de 1000
   */
  const backup = 6500;

  /**
   * Comienzo a iterar por todo el array de blocks_2000
   */
  for (let i = backup; i <= calls; i++) {
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
        const events = await contract.getPastEvents("Deposit", {
          fromBlock: blocks[j].fromBlock,
          toBlock: blocks[j].toBlock
        });

        await saveData(`events/${i}`, events);
        await updateBlocks("blocks_2000", j);
        j++;
      }

      /**
       * Actualizo el indice
       */
      i = j - 1;
    }
  }
  console.log(`events.json written successfully!`);
}

main();
