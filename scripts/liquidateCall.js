// Import the ABIs, see: https://docs.aave.com/developers/developing-on-aave/deployed-contract-instances
import DaiTokenABI from "./DAItoken.json";
import LendingPoolAddressesProviderABI from "./LendingPoolAddressesProvider.json";
import LendingPoolABI from "./LendingPool.json";

// ... The rest of your code ...

// Input variables
const collateralAddress = "THE_COLLATERAL_ASSET_ADDRESS";
const daiAmountInWei = web3.utils.toWei("1000", "ether").toString();
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // mainnet DAI
const user = "USER_ACCOUNT";
const receiveATokens = true;

const lpAddressProviderAddress = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5"; // mainnet
const lpAddressProviderContract = new web3.eth.Contract(
  LendingPoolAddressesProviderABI,
  lpAddressProviderAddress
);

// Get the latest LendingPool contract address
const lpAddress = await lpAddressProviderContract.methods
  .getLendingPool()
  .call()
  .catch((e) => {
    throw Error(`Error getting lendingPool address: ${e.message}`);
  });

// Approve the LendingPool address with the DAI contract
const daiContract = new web3.eth.Contract(DAITokenABI, daiAddress);
await daiContract.methods
  .approve(lpAddress, daiAmountInWei)
  .send()
  .catch((e) => {
    throw Error(`Error approving DAI allowance: ${e.message}`);
  });

// Make the deposit transaction via LendingPool contract
const lpContract = new web3.eth.Contract(LendingPoolABI, lpAddress);
await lpContract.methods
  .liquidationCall(collateralAddress, daiAddress, user, daiAmountInWei, receiveATokens)
  .send()
  .catch((e) => {
    throw Error(`Error liquidating user with error: ${e.message}`);
  });
