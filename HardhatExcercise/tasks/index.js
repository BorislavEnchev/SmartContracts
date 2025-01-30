const { task } = require("hardhat/config");

task("balance", "Prints an account's balance",)
    .addParam("address", "The account's address")
    .setAction(async (taskArgs, hre) => {
        /* const accounts = await hre.ethers.getSigners();
        const account = accounts[0]; */

        const balance = await hre.ethers.provider.getBalance(taskArgs.address);
        console.log("Balance: " + hre.ethers.formatEther(balance) + " ETH");
});


task("blockNumber", "Prints the block number", async (taskArgs, hre) => {
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("Current block number: " + blockNumber);
});

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task("deploy", "Deploy a contract").setAction(async (taskArgs, hre) => {
    const ContractFactory = await hre.ethers.getContractFactory("Lock");
    const contract = await ContractFactory.deploy(1738713521);

    console.log("Contract deployed to:", await contract.getAddress());

    const tx = await contract
        .withdraw()
        .catch((err) => {
            console.log(err.message);
    });
});

task("send", "Send ETH to an account")
    .addParam("to", "The address to send ETH to")
    .addParam("amount", "The amount of ETH to send")
    .setAction(async (taskArgs, hre) => {
        const [signer] = await hre.ethers.getSigners();

        const tx = await signer.sendTransaction({
            to: taskArgs.to,
            value: ethers.parseEther(taskArgs.amount),
        });        
        console.log("Transaction hash: " + tx.hash);

        const receipt = await tx.wait();        
        console.log(receipt);
    }
);

task("token-interaction", "Interacts with an ERC-20 token", async (taskArgs, hre) => {
    const [owner, player1, player2] = await hre.ethers.getSigners();

    console.log("Deploying the MyToken contract...");

    const TokenFactory = await hre.ethers.getContractFactory("MyToken");
    const token = await TokenFactory.deploy(owner.address);

    await token.deployed();
    console.log("MyToken deployed at:", token.address);

    async function displayBalances() {
        const ownerBalance = await token.balanceOf(owner.address);
        const player1Balance = await token.balanceOf(player1.address);
        const player2Balance = await token.balanceOf(player2.address);

        console.log("\nToken Balances:");
        console.log(`Owner   : ${ethers.utils.formatUnits(ownerBalance, 18)} MTK`);
        console.log(`Player1 : ${ethers.utils.formatUnits(player1Balance, 18)} MTK`);
        console.log(`Player2 : ${ethers.utils.formatUnits(player2Balance, 18)} MTK`);
    }

    await displayBalances();

    const mintAmount = ethers.utils.parseUnits("500", 18);

    console.log("\nMinting tokens to Player 1 and Player 2...");

    await token.connect(owner).mint(player1.address, mintAmount);
    await token.connect(owner).mint(player2.address, mintAmount);

    console.log("Minting complete.");

    await displayBalances();
});

task("listen-transfer-events", "Listens for Transfer events from the ERC20 contract", async (taskArgs, hre) => {
    const { ethers } = hre;
    const [deployer] = await ethers.getSigners();

    console.log("Deploying the MyToken contract...");

    const TokenFactory = await ethers.getContractFactory("MyToken");

    // Deploy the contract and pass the constructor argument
    const token = await TokenFactory.deploy(deployer.address);
    
    await token.waitForDeployment(); // Ensures deployment is mined
    console.log("Contract deployed successfully!");
    
    // Log the deployed contract address
    const deployedAddress = token.getAddress ? await token.getAddress() : token.address; // Handle ethers.js v6 and v5
    console.log("MyToken deployed at:", deployedAddress);

    console.log("\nSetting up event listener for Transfer events...");

    const tokenInstance = await ethers.getContractAt("MyToken", deployedAddress);

    // Listen for Transfer events
    tokenInstance.on("Transfer", (from, to, value, event) => {
        console.log("\n=== Transfer Event Detected ===");
        console.log(`From   : ${from}`);
        console.log(`To     : ${to}`);
        console.log(`Value  : ${ethers.utils.formatUnits(value, 18)} MTK`);
        console.log(`Block  : ${event.blockNumber}`);
        console.log("===============================\n");
    });

    console.log("Listening for Transfer events. Trigger a transfer to see the log output.");
    process.stdin.resume(); // Prevent the script from exiting
});


    