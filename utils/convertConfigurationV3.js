const fs = require("fs");
const { ethers } = require("ethers");
require("dotenv").config();

async function convertConfiguration(
  folderName,
  inputFile,
  outputFile,
  hf,
  decimals,
  chainData
) {
  // Valores que modificar antes de hacer el llamado a la funcion
  const FOLDER_NAME = folderName;
  const INPUT_FILE_NAME = inputFile;
  const OUTPUT_FILE_NAME = outputFile;
  const HEALTH_FACTOR_LIMIT = hf || 1.01;
  const WEI_UNITS = decimals || 18;
  fs.readFile(`./${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    const end = data.length;
    for (let i = 0; i <= end; i++) {
      const alldebt = data[i]?.totalDebtBase.slice().length;
      if (data[i]?.formattedHF <= HEALTH_FACTOR_LIMIT && alldebt >= WEI_UNITS) {
        const configuration = decodeConfiguration(data[i].userConfiguration, chainData);
        const info = {
          user: data[i].user,
          totalCollateralBase: data[i].totalCollateralBase,
          formatTotalCollateralBase: data[i].formatTotalCollateralBase,
          totalDebtBase: data[i].totalDebtBase,
          formatTotalDebtBase: data[i].formatTotalDebtBase,
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

function decodeConfiguration(configuration, chainData) {
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
        chainData: chainData[i]
      });
    } else if (bitCouples[i] === "01") {
      data.push({
        code: bitCouples[i],
        col: false,
        debt: true,
        chainData: chainData[i]
      });
    } else if (bitCouples[i] === "11") {
      data.push({
        code: bitCouples[i],
        col: true,
        debt: true,
        chainData: chainData[i]
      });
    } else {
      data.push({
        code: bitCouples[i],
        col: false,
        debt: false,
        chainData: chainData[i]
      });
    }
  }

  return data;
}

// convertConfiguration("data_polygon", "formatted_users_data_polygon", "users_ready");

module.exports = { convertConfiguration };
