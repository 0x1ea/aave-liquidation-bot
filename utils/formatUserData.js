const fs = require("fs");
const { ethers } = require("ethers");

// Valores que modificar antes de hacer el llamado a la funcion
const FOLDER_NAME = "data_polygon";
const INPUT_FILE_NAME = "users_data_polygon";
const OUTPUT_FILE_NAME = "formatted_users_data_polygon";

async function formatUserData() {
  fs.readFile(`./${FOLDER_NAME}/${INPUT_FILE_NAME}.json`, async (err, buf) => {
    let save = buf.toString();
    const data = await JSON.parse(save);
    const newUser = [];
    // const end = data.length;
    // for (let i = 0; i <= end; i++) {
    //   const info = {
    //     user: data[i].user,
    //     totalCollateralETH: data[i].totalCollateralETH,
    //     formatTotalCollateralETH: ethers.utils.formatEther(data[i].totalCollateralETH),
    //     totalDebtETH: data[i].totalDebtETH,
    //     formatTotalDebtETH: ethers.utils.formatEther(data[i].totalDebtETH),
    //     availableBorrowsETH: data[i].availableBorrowsETH,
    //     healthFactor: data[i].healthFactor,
    //     formattedHF: data[i].formattedHF
    //   };
    //   newUser.push(info);
    // }
    data.forEach(user => {
      const info = {
        user: user.user,
        totalCollateralETH: user.totalCollateralETH,
        formatTotalCollateralETH: parseFloat(
          ethers.utils.formatEther(user.totalCollateralETH)
        ),
        totalDebtETH: user.totalDebtETH,
        formatTotalDebtETH: parseFloat(ethers.utils.formatEther(user.totalDebtETH)),

        healthFactor: user.healthFactor,
        formattedHF: user.formattedHF
      };
      newUser.push(info);
    });

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

formatUserData();

module.exports = { formatUserData };
