const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe.only("VotingSystem", function () {
    async function deployVotingSystemFixture() {
        const [ deployer, otherAccount ] = await ethers.getSigners();
        
        const VotingSystemFactory = await ethers.getContractFactory("VotingSystem");
        const votingSystem = await VotingSystemFactory.deploy();
        await votingSystem.waitForDeployment();

        return { votingSystem, deployer, otherAccount };
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

        it("Should verify the initial state after deployment", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);
    
            expect(await votingSystem.owner()).to.equal(deployer.address);    
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
    
    describe("Voting", async function () {
        it("Should successfuly vote for a proposal", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);

            await votingSystem.createProposal("Description", 100);
            await votingSystem.vote(0);

            const proposal = await votingSystem.proposals(0);
            expect(await proposal.voteCount).to.equal(1);
        });

        it("Should allow multiple accounts to vote on the same proposal", async function () {
            const { votingSystem, deployer, otherAccount } = await loadFixture(deployVotingSystemFixture);
            
            await votingSystem.createProposal("Multiple Voters", 100);
            
            await votingSystem.vote(0);
            await votingSystem.connect(otherAccount).vote(0);
        
            const proposal = await votingSystem.proposals(0);
            expect(proposal.voteCount).to.equal(2);
        });

        it("Should fail if the proposal does not exist", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);

            await expect(votingSystem.vote(0))
              .to.be.revertedWithCustomError(votingSystem, "InvalidProposal");
        });

        it("Should fail if the caller has already voted", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);

            await votingSystem.createProposal("Description", 100);
            await votingSystem.vote(0);

            await expect(votingSystem.vote(0))
              .to.be.revertedWithCustomError(votingSystem, "AlreadyVoted");
        });

        it("Should revert if the voting period has ended", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);

            await votingSystem.createProposal("Description", 100);

            await ethers.provider.send("evm_increaseTime", [101]);

            await expect(votingSystem.vote(0))
              .to.be.revertedWithCustomError(votingSystem, "VotingEnded");
        });

        
        it("Should revert if voting period has not ended", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);
        
            await votingSystem.createProposal("Description", 100);
        
            // Try to execute the proposal before the voting period ends
            await expect(votingSystem.executeProposal(0))
                .to.be.revertedWithCustomError(votingSystem, "VotingNotEnded");
        });

        it("Should revert if vote on already executed proposal", async function () {
            const { votingSystem, deployer, otherAccount } = await loadFixture(deployVotingSystemFixture);
        
            const votingSystemWithSigner = votingSystem.connect(deployer);
            const votingSystemWithOtherAccount = votingSystem.connect(otherAccount);
        
            await votingSystemWithSigner.createProposal("Description", 100);
        
            await votingSystemWithSigner.vote(0);
            
            await ethers.provider.send("evm_increaseTime", [101]);
        
            await votingSystemWithSigner.executeProposal(0);
        
            await expect(votingSystemWithOtherAccount.vote(0))
                .to.be.revertedWithCustomError(votingSystem, "ProposalAlreadyExecuted");
        });

        it("Should revert if the proposal has already been executed", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);
        
            // Create proposal and vote
            await votingSystem.createProposal("Description", 100);
            await votingSystem.vote(0);
        
            // Move time beyond voting period
            await ethers.provider.send("evm_increaseTime", [101]);
        
            // Execute the proposal once
            await votingSystem.executeProposal(0);
        
            // Try executing again on the same proposal, should revert
            await expect(votingSystem.executeProposal(0))
                .to.be.revertedWithCustomError(votingSystem, "ProposalAlreadyExecuted");
        });

        it("Should execute a proposal with no votes", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);
            
            await votingSystem.createProposal("No Votes", 100);
            await ethers.provider.send("evm_increaseTime", [101]);
            await ethers.provider.send("evm_mine");
            
            await expect(votingSystem.executeProposal(0))
                .to.emit(votingSystem, "ProposalExecuted")
                .withArgs(0, 0); // Expecting 0 votes
        
            const proposal = await votingSystem.proposals(0);
            expect(proposal.executed).to.be.true;
        });

    });

    describe("Time-based tests", function () {
        it("Should allow voting within the valid time period", async function () {
            const { votingSystem, otherAccount } = await loadFixture(deployVotingSystemFixture);
    
            await votingSystem.createProposal("Test Proposal", 200);
    
            // Voting within the allowed time
            await votingSystem.connect(otherAccount).vote(0);
    
            const proposal = await votingSystem.proposals(0);
            expect(proposal.voteCount).to.equal(1);
        });
    
        it("Should revert voting after the voting period has ended", async function () {
            const { votingSystem, otherAccount } = await loadFixture(deployVotingSystemFixture);
    
            await votingSystem.createProposal("Test Proposal", 100);
    
            // Move time beyond voting period
            await ethers.provider.send("evm_increaseTime", [101]);
            await ethers.provider.send("evm_mine");
    
            await expect(votingSystem.connect(otherAccount).vote(0))
                .to.be.revertedWithCustomError(votingSystem, "VotingEnded");
        });
    
        it("Should execute proposal only after voting period ends", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);
    
            await votingSystem.createProposal("Test Proposal", 100);
    
            // Try to execute before time has passed
            await expect(votingSystem.executeProposal(0))
                .to.be.revertedWithCustomError(votingSystem, "VotingNotEnded");
    
            // Move time beyond voting period
            await ethers.provider.send("evm_increaseTime", [101]);
            await ethers.provider.send("evm_mine");
    
            await expect(votingSystem.executeProposal(0))
                .to.emit(votingSystem, "ProposalExecuted")
                .withArgs(0, 0);
        });
    
        it("Should prevent re-executing an already executed proposal", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);
    
            await votingSystem.createProposal("Test Proposal", 100);
    
            await ethers.provider.send("evm_increaseTime", [101]);
            await ethers.provider.send("evm_mine");
    
            await votingSystem.executeProposal(0);
    
            await expect(votingSystem.executeProposal(0))
                .to.be.revertedWithCustomError(votingSystem, "ProposalAlreadyExecuted");
        });
    });
    
    describe("Test Events", function () {
        it("Should emit a ProposalCreated event", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);
    
            const tx = await votingSystem.createProposal("Description", 100);
    
            const blockTimestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
    
            await expect(tx)
                .to.emit(votingSystem, "ProposalCreated")
                .withArgs(0, "Description", blockTimestamp + 100);
        });
    
        it("Should emit a VoteCasted event", async function () {
            const { votingSystem, otherAccount } = await loadFixture(deployVotingSystemFixture);
    
            const proposal = await votingSystem.createProposal("Description", 100);
    
            const tx = await votingSystem.connect(otherAccount).vote(0);
    
            await expect(tx)
                .to.emit(votingSystem, "VoteCast")
                .withArgs(0, otherAccount.address);
        });
    
        it("Should emit a ProposalExecuted event", async function () {
            const { votingSystem, deployer } = await loadFixture(deployVotingSystemFixture);
    
            await votingSystem.createProposal("Description", 100);
            await votingSystem.vote(0);
    
            await ethers.provider.send("evm_increaseTime", [101]);
    
            const tx = await votingSystem.executeProposal(0);            
    
            await expect(tx)
                .to.emit(votingSystem, "ProposalExecuted")
                .withArgs(0, 1);

                
            // Additional argument checks                
            const proposal = await votingSystem.proposals(0);
            expect(proposal.description).to.equal("Description");
            expect(proposal.voteCount).to.equal(1);
            expect(proposal.executed).to.be.true;
        });
    });

    describe("Test Access Control", function () {
        it("Should revert on createProposal if the caller is not the owner", async function () {
            const { votingSystem } = await loadFixture(deployVotingSystemFixture);
            const [_, otherAccount] = await ethers.getSigners();
    
            await expect(votingSystem.connect(otherAccount).createProposal("Description", 100))
                .to.be.revertedWithCustomError(votingSystem, "NotOwner");
        });

        it("Should revert on executeProposal if the caller is not the owner", async function () {
            const { votingSystem, otherAccount } = await loadFixture(deployVotingSystemFixture);
    
            await votingSystem.createProposal("Description", 100);
            await votingSystem.vote(0);
    
            await ethers.provider.send("evm_increaseTime", [101]);
    
            await expect(votingSystem.connect(otherAccount).executeProposal(0))
                .to.be.revertedWithCustomError(votingSystem, "NotOwner");
        });
    });
});
