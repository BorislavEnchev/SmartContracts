const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe.only("VotingSystem", function () {
    async function deployVotingSystemFixture() {
        const [deployer] = await ethers.getSigners();
        const VotingSystem = await ethers.getContractFactory("VotingSystem");
        const votingSystem = await VotingSystem.deploy();
        await votingSystem.waitForDeployment();

        return { votingSystem, deployer };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);

            expect(await votingSystem.owner()).to.equal(deployer.address);
        });

        it("Should set the proposal count to 0", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);

            expect(await votingSystem.proposalCount()).to.equal(0);
        });
    });

    describe("Create Proposal", function () {
        it("Should create a proposal", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);

            await votingSystem.createProposal("Description", 100);

            expect(await votingSystem.proposalCount()).to.equal(1);
        });

        it("Should fail if the caller is not the owner", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);
            const [_, otherAccount] = await ethers.getSigners();
      
            await expect(votingSystem.connect(otherAccount).createProposal("Description", 100))
              .to.be.revertedWithCustomError(votingSystem, "NotOwner");
        });
      
        it("Should emit a ProposalCreated event", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);
        
            const tx = await votingSystem.createProposal("Description", 100);
        
            const blockTimestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

            await expect(tx)
              .to.emit(votingSystem, "ProposalCreated")
              .withArgs(0, "Description", blockTimestamp + 100);
        });

        it("Should fail if the duration is 0", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);
        
            await expect(votingSystem.createProposal("Description", 0))
              .to.be.revertedWithCustomError(votingSystem, "InvalidVotingPeriod");
        });
    });
    
});
