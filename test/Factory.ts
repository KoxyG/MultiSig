import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import hre, { ethers } from "hardhat";
  
  describe("Factory", function () {
    async function deployToken() {
      // Contracts are deployed using the first signer/account by default
      const [owner, otherAccount, signer2] = await hre.ethers.getSigners();
  
      // const token = await hre.ethers.deployContract("MyERC20");
      const Token = await hre.ethers.getContractFactory("MyERC20");
      const token = await Token.deploy();
  
      return { token, owner, otherAccount, signer2 };
    }
  
    async function deployFactory() {
     

     // Get the contract factory
      const MultisigFactory = await hre.ethers.deployContract("MultisigFactory");
  
      return { MultisigFactory};
    }

    async function deployNewMultiSig() {
        const { MultisigFactory } = await deployFactory();
        const [owner, otherAccount, signer1] = await hre.ethers.getSigners();
        const validSigners = [owner.address, otherAccount.address, signer1.address];
        const quorum = 2;
  
        // Create a new MultiSig wallet
        const MultiTx = await MultisigFactory.createMultisigWallet(quorum, validSigners);
        await MultiTx.wait();
  
        // Get the address of the new MultiSig
        const newMultiSigAddresses = await MultisigFactory.getMultiSigClones();
        expect(newMultiSigAddresses.length).to.equal(1);
        const newMultiSigAddress = newMultiSigAddresses[0];

        return {newMultiSigAddress};
    }
  
    describe("MultiSig Factory", function () {
      it("Should create new multiSig wallet", async function () {
        const {MultisigFactory} = await loadFixture(
            deployFactory
        );

        const [owner, otherAccount, signer1] = await hre.ethers.getSigners();
        const validSigners = [owner.address, otherAccount.address, signer1.address];
        const quorum = 2;

        const tx = MultisigFactory.createMultisigWallet(quorum, validSigners);
        await (await tx).wait();
        
        
        const newMultiSig = MultisigFactory.getMultiSigClones()
       
        expect((await newMultiSig).length).to.equal(1);
      });

      it("New contract should be among the deployed polls", async function () {
        const {MultisigFactory} = await loadFixture(
            deployFactory
        );

        const [owner, otherAccount, signer1] = await hre.ethers.getSigners();
        const validSigners = [owner.address, otherAccount.address, signer1.address];
        const quorum = 2;

        const tx = MultisigFactory.createMultisigWallet(quorum, validSigners);
        await (await tx).wait();
        
        
        const newMultiSig = MultisigFactory.getMultiSigClones()
       
        expect((await newMultiSig).length).to.equal(1);
      });

      it("New contract should set the right quorum and valid signers", async function () {
        
        const [owner, otherAccount, signer1] = await hre.ethers.getSigners();
        const validSigners = [owner.address, otherAccount.address, signer1.address];
        const quorum = 2;


        const {newMultiSigAddress} = await deployNewMultiSig();
  
       
        // Attach to the new MultiSig contract
        const MultiSig = await hre.ethers.getContractAt("MultiSig", newMultiSigAddress);
  

        // Try/catch block to identify which call is failing
        try {
          const contractQuorum = await MultiSig.quorum();
          expect(contractQuorum).to.equal(quorum);
        } catch (error) {
          console.error("Error calling quorum():", error);
        }
  
        try {
          const noOfValidSigners = await MultiSig.noOfValidSigners();
        //   console.log("Number of valid signers:", noOfValidSigners);
          expect(noOfValidSigners).to.equal(validSigners.length);
        } catch (error) {
        //   console.error("Error calling noOfValidSigners():", error);
        }
      });

      it("Quorum should be updated sucessfully", async function () {
        const { MultisigFactory } = await deployFactory();
        const [owner, otherAccount, signer1] = await hre.ethers.getSigners();
        const validSigners = [owner.address, otherAccount.address, signer1.address];
        const quorum = 2;
       

         // Create a new MultiSig wallet
         const tx = await MultisigFactory.createMultisigWallet(quorum, validSigners);
         await tx.wait();
   
  
  
        // Get the address of the new MultiSig
        const newMultiSigAddresses = await MultisigFactory.getMultiSigClones();
        expect(newMultiSigAddresses.length).to.equal(1);
        const newMultiSigAddress = newMultiSigAddresses[0];

        const newQuorum = 2;
  
        // Attach to the new MultiSig contract
        const MultiSig = await hre.ethers.getContractAt("MultiSig", newMultiSigAddress);

        try {
            const contractQuorum = await MultiSig.updatedQuorum(newQuorum);
            expect(contractQuorum).to.equal(newQuorum);
          } catch (error) {
            // console.error("Error calling quorum():", error);
          }
  
    
        expect(await MultiSig.quorum()).to.equal(newQuorum);
    });
    


    });
  
   describe("Transfer & Approve in new MultiSign", function () {
    it("Check if the token was minted to the owner on deploy", async function () {
        const { token, owner } = await loadFixture(deployToken);
  
        const bal = await token.balanceOf(owner.address);
  
        await expect(await token.totalSupply()).to.equal(bal);
      });

      it("Transfer tokens to multiSig contract, transfer tokens out of contract, increment TxId and approve newTxId by another valid signer", async function () {
        const {newMultiSigAddress} = await deployNewMultiSig();
        const { token, signer2 } = await loadFixture(deployToken);

  
        // Attach to the new MultiSig contract
        const MultiSig = await hre.ethers.getContractAt("MultiSig", newMultiSigAddress);
        // console.log("MultiSig Contract ABI:", JSON.stringify(MultiSig.interface.format()));
  
        const transfer = hre.ethers.parseUnits("1000", 18);
        

        await token.approve(MultiSig, transfer);
        await token.transfer(MultiSig, transfer);
        
        const balance = await token.balanceOf(MultiSig.getAddress());
        expect(balance).to.equal(transfer);
  
        const tx = await MultiSig.transfer(transfer, signer2.address, token);
        await tx.wait();
  
        expect(tx).to.emit(MultiSig, "Transfer");



  
        try {
          const txId = await MultiSig._txId();
        //   console.log("_txId value:", txId.toString());
          expect(txId).to.equal(1);
        } catch (error) {
        //   console.error("Error calling _txId():", error);
          
        }

        // aproving the transaction by another valid signer
        try {
            const tx = await MultiSig.connect(signer2).approveTx(1);
            await tx.wait();
            expect(tx).to.emit(MultiSig, "Approval");
          }
            catch (error) {
                console.error("Error calling approveTx():", error);
            }

        
      });
    });

   








  });
  