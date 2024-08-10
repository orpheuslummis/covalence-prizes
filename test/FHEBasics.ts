import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createFheInstance, FheInstance } from "../utils/instance";
import { connectDiamond, DiamondWithFacets } from "./utils";

// Declare hre as a global variable
declare const hre: HardhatRuntimeEnvironment;

describe("FHE Basics", function () {
    let d: DiamondWithFacets;
    let fheClient: FheInstance;

    before(async function () {
        const [owner] = await ethers.getSigners();
        d = await connectDiamond(owner);
        fheClient = await createFheInstance(hre, await d.getAddress());
    });

    async function logTransaction(result: any, operation: string) {
        console.log(`${operation} - Result:`, result);
        if (result && typeof result.wait === 'function') {
            console.log(`${operation} - Transaction Hash:`, result.hash);
            const receipt = await result.wait();
            console.log(`${operation} - Block Number:`, receipt.blockNumber);
            console.log(`${operation} - Gas Used:`, receipt.gasUsed.toString());
        } else {
            console.log(`${operation} - No transaction object returned`);
        }
    }

    describe("FHE Operations", function () {
        it("should correctly add two encrypted numbers", async function () {
            console.log("Starting test: should correctly add two encrypted numbers");
            const a = 10;
            const b = 20;
            const expectedSum = a + b;
            console.log(`Input values: a = ${a}, b = ${b}, expectedSum = ${expectedSum}`);

            console.log("Encrypting values...");
            const encryptedA = await fheClient.instance.encrypt_uint32(a);
            const encryptedB = await fheClient.instance.encrypt_uint32(b);
            console.log("Encryption complete");

            console.log("Calling addEncrypted function...");
            const txResponse = await d.addEncrypted(encryptedA, encryptedB);
            await logTransaction(txResponse, "Add Encrypted");

            console.log("Getting the result...");
            const sealedResult = await d.getLastSum(fheClient.permission);
            console.log("Sealed Result:", sealedResult);

            const decryptedSum = await fheClient.instance.unseal(await d.getAddress(), sealedResult);
            console.log(`Decrypted sum: ${decryptedSum}`);
            expect(Number(decryptedSum)).to.equal(expectedSum);
        });

        it("should correctly multiply two encrypted numbers", async function () {
            const a = 5;
            const b = 7;
            const expectedProduct = a * b;

            const encryptedA = await fheClient.instance.encrypt_uint32(a);
            const encryptedB = await fheClient.instance.encrypt_uint32(b);

            console.log("Calling multiplyEncrypted function...");
            const txResponse = await d.multiplyEncrypted(encryptedA, encryptedB);
            await logTransaction(txResponse, "Multiply Encrypted");

            console.log("Getting the result...");
            const sealedResult = await d.getLastProduct(fheClient.permission);
            console.log("Sealed Result:", sealedResult);

            const decryptedProduct = await fheClient.instance.unseal(await d.getAddress(), sealedResult);
            expect(Number(decryptedProduct)).to.equal(expectedProduct);
        });

        it("should correctly compare two encrypted numbers", async function () {
            const a = 15;
            const b = 20;

            const encryptedA = await fheClient.instance.encrypt_uint32(a);
            const encryptedB = await fheClient.instance.encrypt_uint32(b);

            console.log("Calling compareEncrypted function...");
            const txResponse = await d.compareEncrypted(encryptedA, encryptedB);
            await logTransaction(txResponse, "Compare Encrypted");

            console.log("Getting the result...");
            const sealedResult = await d.getLastComparison(fheClient.permission);
            console.log("Sealed Result:", sealedResult);

            const decryptedComparison = await fheClient.instance.unseal(await d.getAddress(), sealedResult);
            expect(Boolean(decryptedComparison)).to.be.true; // a <= b should be true
        });

        it("should correctly select between two encrypted numbers", async function () {
            const a = 25;
            const b = 20;
            const expectedResult = a; // Since a > b, it should select a

            const encryptedA = await fheClient.instance.encrypt_uint32(a);
            const encryptedB = await fheClient.instance.encrypt_uint32(b);

            console.log("Calling selectEncrypted function...");
            const txResponse = await d.selectEncrypted(encryptedA, encryptedB);
            await logTransaction(txResponse, "Select Encrypted");

            console.log("Getting the result...");
            const sealedResult = await d.getLastSelection(fheClient.permission);
            console.log("Sealed Result:", sealedResult);

            const decryptedResult = await fheClient.instance.unseal(await d.getAddress(), sealedResult);
            expect(Number(decryptedResult)).to.equal(expectedResult);
        });
    });
});