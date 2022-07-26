require("dotenv").config();
const fs = require("fs");

async function convertConfiguration(folderName, inputFile, outputFile, hf, chainData) {
  const FOLDER_NAME = folderName;
  const INPUT_FILE_NAME = inputFile;
  const OUTPUT_FILE_NAME = outputFile;
  const HEALTH_FACTOR_LIMIT = hf || 1.01;
  fs.readFile(`./data/${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    const end = data.length;
    for (let i = 0; i <= end; i++) {
      if (data[i]?.formattedHF <= HEALTH_FACTOR_LIMIT) {
        const configuration = decodeConfiguration(data[i].userConfiguration, chainData);
        const info = {
          user: data[i].user,
          totalCollateralETH: data[i].totalCollateralETH,
          formatTotalCollateralETH: data[i].formatTotalCollateralETH,
          totalDebtETH: data[i].totalDebtETH,
          formatTotalDebtETH: data[i].formatTotalDebtETH,
          healthFactor: data[i].healthFactor,
          formattedHF: data[i].formattedHF,
          userConfiguration: configuration
        };
        newUser.push(info);
      }
    }

    fs.writeFile(
      `./data/${FOLDER_NAME}/${OUTPUT_FILE_NAME}.json`,
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
    } else if (bitCouples[i] == "01" || bitCouples[i] == "1") {
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
    }
  }

  return data;
}

module.exports = { convertConfiguration };
