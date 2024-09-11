import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("MultiSig", function () {
  async function deployToken() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, signer2] = await hre.ethers.getSigners();

    // const token = await hre.ethers.deployContract("MyERC20");
    const Token = await hre.ethers.getContractFactory("MyERC20");
    const token = await Token.deploy();

    return { token, owner, otherAccount, signer2 };
  }

  async function deployMultiSig() {
    const [owner, otherAccount, signer1] = await hre.ethers.getSigners();
    const validSigners = [owner.address, otherAccount.address, signer1.address];
    const quorum = 2;

    // Get the contract factory
    const MultiSig = await hre.ethers.deployContract("MultiSig", [
      quorum,
      validSigners,
    ]);

    return { MultiSig, owner, otherAccount, signer1 };
  }

  describe("Deployment", function () {
    it("Should set the right quorum and valid signers", async function () {
      const { MultiSig, otherAccount, signer1 } = await loadFixture(
        deployMultiSig
      );

      const quorum = await MultiSig.quorum();

      expect(await MultiSig.quorum()).to.equal(2);
      expect(await MultiSig.noOfValidSigners()).to.equal(3);
    });
  });

  describe("Transfer", function () {
    it("Check if the token was minted to the owner on deploy", async function () {
      const { token, owner } = await loadFixture(deployToken);

      const bal = await token.balanceOf(owner.address);

      await expect(await token.totalSupply()).to.equal(bal);
    });

    it("Transfer from owner to multiSig contract & increment TxId", async function () {
      const { MultiSig } = await loadFixture(deployMultiSig);
      const { token, owner, signer2 } = await loadFixture(deployToken);

      const transfer = hre.ethers.parseUnits("1000", 18);
      const transferAmount = hre.ethers.parseUnits("100", 18);

     

      await token.connect(owner).approve(MultiSig, transfer);
      await token.transfer(MultiSig, transfer);
     

      const balance = await token.balanceOf(MultiSig.getAddress());

      expect(balance).to.equal(transfer);

      const tx = MultiSig.connect(owner).transfer(transfer, signer2.address, token)
      await (await tx).wait();


      expect(tx).to.emit(
            MultiSig,
            "Transfer"
          );

     
      expect(await MultiSig._txId()).to.equal(1);

    });


    it("Update Quorum sucessfully", async function () {
        const { MultiSig, otherAccount, signer1 } = await loadFixture(
            deployMultiSig
        );
    
        const newQuorum = 3;
    
        const tx = MultiSig.connect(otherAccount).updatedQuorum(newQuorum);
    
        await (await tx).wait();
    
        expect(await MultiSig.quorum()).to.equal(newQuorum);
    });
    
  });
});
