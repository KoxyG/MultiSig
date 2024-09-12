import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Starting script execution...");

  // Check if environment variables are set
  if (!process.env.LISK_RPC_URL) {
    throw new Error("LISK_RPC_URL is not set in the environment variables");
  }
  if (!process.env.ACCOUNT_PRIVATE_KEY || !process.env.ACCOUNT_PRIVATE_KEY_2 || !process.env.ACCOUNT_PRIVATE_KEY_3) {
    throw new Error("One or more account private keys are not set in the environment variables");
  }

  const tokenAddress = "0x90b2da112105CB961569379C37624992FA352E5C";
  const factoryAddress = "0x4f031926233c3216d0303acF1a9e948Df7c088cE";

  // Get signers
  const [owner, otherAccount, signer1] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("Other account address:", otherAccount.address);
  console.log("Signer1 address:", signer1.address);

  // Attach to existing contracts
  console.log("Attaching to existing contracts...");
  const token = await ethers.getContractAt("MyERC20", tokenAddress, owner);
  const MultisigFactory = await ethers.getContractAt("MultisigFactory", factoryAddress, owner);
  console.log("Contracts attached successfully..");

  // Use addresses of the three signers
  const validSigners = [owner.address, otherAccount.address, signer1.address];
  const quorum = 2;
  console.log("Valid signers:", validSigners);
  console.log("Quorum:", quorum);

  // Create a new MultiSig wallet
  console.log("Creating new MultiSig wallet...");
  const tx = await MultisigFactory.createMultisigWallet(quorum, validSigners);
  console.log("Transaction sent, waiting for confirmation...");
  const receipt = await tx.wait();
 

  console.log("Retrieving MultiSig address...");
  const newMultiSigAddresses = await MultisigFactory.getMultiSigClones();
  if (newMultiSigAddresses.length === 0) {
    throw new Error("No MultiSig addresses returned");
  }
  const newMultiSigAddress = newMultiSigAddresses[newMultiSigAddresses.length - 1];
  console.log("New MultiSig created at:", newMultiSigAddress);

  // Attach to the new MultiSig contract
  const MultiSig = await ethers.getContractAt("MultiSig", newMultiSigAddress, owner);

  // Verify MultiSig setup
  console.log("Verifying MultiSig setup...");
  const contractQuorum = await MultiSig.quorum();
  console.log("Contract quorum:", contractQuorum.toString());

  // Assuming you have a function to get signers, if not, you should add one
  // const contractSigners = await MultiSig.getSigners();
  // console.log("Contract signers:", contractSigners);

  // Transfer tokens to MultiSig
  console.log("Transferring tokens to MultiSig...");
  const transfer = ethers.parseUnits("1000", 18);
  await (await token.approve(newMultiSigAddress, transfer)).wait();
  await (await token.transfer(newMultiSigAddress, transfer)).wait();
  const balance = await token.balanceOf(newMultiSigAddress);
  console.log("MultiSig token balance:", ethers.formatUnits(balance, 18));

  // Initiate a transfer from MultiSig
  console.log("Initiating transfer from MultiSig...");
  const transferTx = await MultiSig.transfer(transfer, otherAccount.address, tokenAddress);
  const transferReceipt = await transferTx.wait();
 
  // Get the current transaction ID
  const txId = await MultiSig._txId();
  console.log("Current transaction ID:", txId.toString());

  // Add a delay to ensure the previous transaction is fully processed
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

  // Approve the transaction by another signer
  console.log("Approving transaction...");
  console.log("Approving with address:", signer1.address);
  
  // Check if signer1 is a valid signer right before approval
  // Uncomment if you have an isValidSigner function
  // const isValidSigner = await MultiSig.isValidSigner(signer1.address);
  // console.log("Is signer1 a valid signer:", isValidSigner);

  const approveTx = await MultiSig.connect(signer1).approveTx(txId);
  const approveReceipt = await approveTx.wait();
  

  console.log("Script execution completed.");
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exitCode = 1;
});