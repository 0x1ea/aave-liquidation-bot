const fs = require("fs");
const { ethers } = require("ethers");

const LendingPoolABI = require("../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json");
const erc20ABI = require("../artifacts/contracts/interfaces/IWeth.sol/IWeth.json");
const chainData = require("../constants/reservesList.json");
require("dotenv").config();

// Valores que modificar antes de hacer el llamado a la funcion
const FOLDER_NAME = "data_polygon";
const INPUT_FILE_NAME = "users_configuration";
const OUTPUT_FILE_NAME = "users_ready";

async function convertConfiguration() {
  fs.readFile(`./${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    const end = data.length;
    for (let i = 0; i <= end; i++) {
      const alldebt = data[i]?.totalDebtETH.slice().length;
      if (data[i]?.formattedHF <= 1 && alldebt >= 16) {
        const configuration = decodeConfiguration(data[i].userConfiguration);
        const info = {
          user: data[i].user,
          totalCollateralETH: data[i].totalCollateralETH,
          formatTotalCollateralETH: parseFloat(
            ethers.utils.formatEther(data[i].totalCollateralETH)
          ),
          totalDebtETH: data[i].totalDebtETH,
          formatTotalDebtETH: parseFloat(ethers.utils.formatEther(data[i].totalDebtETH)),
          healthFactor: data[i].healthFactor,
          formattedHF: data[i].formattedHF,
          userConfiguration: configuration
        };
        newUser.push(info);
      }
    }

    fs.writeFile(
      `./${FOLDER_NAME}/${OUTPUT_FILE_NAME}.json`,
      JSON.stringify(newUser),
      err => {
        if (err) {
          return console.error(err);
        }
      }
    );
  });
}

function decodeConfiguration(configuration) {
  let binConf = parseInt(configuration).toString(2);
  const confLength = binConf.slice().length;
  const isPair = confLength % 2 ? false : true;

  let bitCouples = [];

  if (isPair) {
    let bits = binConf;
    const length = confLength / 2;
    for (let index = 0; index < length; index++) {
      const newCouple = bits.slice(-2);
      bitCouples.push(newCouple);
      bits = bits.slice(0, -2);
    }
  } else {
    let bits = binConf;
    const length = confLength / 2 - 1;
    for (let index = 0; index < length; index++) {
      const newCouple = bits.slice(-2);
      bitCouples.push(newCouple);
      bits = bits.slice(0, -2);
      if (bits.slice().length <= 2) {
        bitCouples.push(bits);
      }
    }
  }

  const data = [];
  for (let i = 0; i < bitCouples.length; i++) {
    if (bitCouples[i] === "10") {
      data.push({
        code: bitCouples[i],
        col: true,
        debt: false,
        chainData: chainData.polygon[i]
      });
    } else if (bitCouples[i] === "01") {
      data.push({
        code: bitCouples[i],
        col: false,
        debt: true,
        chainData: chainData.polygon[i]
      });
    } else if (bitCouples[i] === "11") {
      data.push({
        code: bitCouples[i],
        col: true,
        debt: true,
        chainData: chainData.polygon[i]
      });
    } else {
      data.push({
        code: bitCouples[i],
        col: false,
        debt: false,
        chainData: chainData.polygon[i]
      });
    }
  }

  return data;
}

convertConfiguration();

module.exports = { convertConfiguration };
