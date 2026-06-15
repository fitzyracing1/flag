const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function deploy() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://localhost:8545");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

  console.log("Deploying contracts with account:", wallet.address);

  // Deploy FireCoin
  const fireCoinABI = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/FireCoin.json"))).abi;
  const fireCoinBytecode = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/FireCoin.json"))).bytecode;
  const FireCoin = new ethers.ContractFactory(fireCoinABI, fireCoinBytecode, wallet);
  const fireCoin = await FireCoin.deploy();
  await fireCoin.waitForDeployment();
  console.log("FireCoin deployed to:", await fireCoin.getAddress());

  // Deploy LiquidityPool
  const liquidityPoolABI = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/LiquidityPool.json"))).abi;
  const liquidityPoolBytecode = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/LiquidityPool.json"))).bytecode;
  const LiquidityPool = new ethers.ContractFactory(liquidityPoolABI, liquidityPoolBytecode, wallet);
  const liquidityPool = await LiquidityPool.deploy();
  await liquidityPool.waitForDeployment();
  console.log("LiquidityPool deployed to:", await liquidityPool.getAddress());

  // Deploy PrepaidCardManager
  const managerABI = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/PrepaidCardManager.json"))).abi;
  const managerBytecode = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/PrepaidCardManager.json"))).bytecode;
  const PrepaidCardManager = new ethers.ContractFactory(managerABI, managerBytecode, wallet);
  const manager = await PrepaidCardManager.deploy(await fireCoin.getAddress(), await liquidityPool.getAddress());
  await manager.waitForDeployment();
  console.log("PrepaidCardManager deployed to:", await manager.getAddress());

  // Grant roles
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  await fireCoin.grantRole(MINTER_ROLE, await manager.getAddress());
  await fireCoin.grantRole(BURNER_ROLE, await manager.getAddress());
  console.log("Roles granted to PrepaidCardManager");

  const addresses = {
    fireCoin: await fireCoin.getAddress(),
    liquidityPool: await liquidityPool.getAddress(),
    prepaidCardManager: await manager.getAddress(),
  };

  fs.writeFileSync(path.join(__dirname, "deployed-addresses.json"), JSON.stringify(addresses, null, 2));
  console.log("Deployed addresses saved to deployed-addresses.json");
  return addresses;
}

deploy().catch(console.error);
