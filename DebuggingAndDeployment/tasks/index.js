task("deploy", "Deploy the contract", async (taskArgs, hre) => {
    if (!taskArgs.unlockTime) {
        throw new Error("You need to specify the unlock time");
    }

    const ContractFactory = await hre.ethers.getContractFactory("Lock");
    const contract = await ContractFactory.deploy(taskArgs.unlockTime);
    console.log("Contract deployed to address:", contract.target);

    await contract.waitForDeployment();

    const unlockTimeSet = await contract.unlockTime();
    if (unlockTimeSet.toString() !== taskArgs.unlockTime) {
        console.log("Unlock time was not set correctly");        
    }
})
.addParam("unlockTime", "The time when the contract will unlock");

task("test", "Test the deployment", async (_, hre) => {
    const ContractFactory = await hre.ethers.getContractFactory("Lock");
    const contract = await ContractFactory.attach("0x1bB6e8EE1422EdF0A55E77b809E8Ab852B0F62fF");

    const unlockTimeSet = await contract.unlockTime();
    console.log("unlockTimeSet", unlockTimeSet.toString());
});