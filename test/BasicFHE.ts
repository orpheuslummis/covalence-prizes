// test/BasicFHE.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { FhenixClient } from "fhenixjs";
import { BasicFHE } from "../types";
import hre from "hardhat";
import { createFheInstance } from "../utils/instance";

describe.skip("BasicFHE", function () {
  let basicFHE: BasicFHE;
  let client: FhenixClient;
  let contractAddress: string;
  let permission: any;

  before(async function () {
    const BasicFHE = await ethers.getContractFactory("BasicFHE");
    basicFHE = await BasicFHE.deploy();
    await basicFHE.waitForDeployment();

    contractAddress = await basicFHE.getAddress();
    const fheInstance = await createFheInstance(hre, contractAddress);
    client = fheInstance.instance;
    permission = fheInstance.permission;
  });

  it("should perform addition on encrypted values", async function () {
    const value1 = 30;
    const value2 = 12;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.addSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 + value2);
  });

  it("should perform multiplication on encrypted values", async function () {
    const value1 = 5;
    const value2 = 7;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.multiplySealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 * value2);
  });

  it("should perform subtraction on encrypted values", async function () {
    const value1 = 20;
    const value2 = 8;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.subtractSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 - value2);
  });

  it("should perform division on encrypted values", async function () {
    const value1 = 40;
    const value2 = 5;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.divideSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(Math.floor(value1 / value2));
  });

  it("should perform modulo on encrypted values", async function () {
    const value1 = 29;
    const value2 = 6;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.modSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 % value2);
  });

  it("should perform bitwise AND on encrypted values", async function () {
    const value1 = 0b1010;
    const value2 = 0b1100;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.bitwiseAndSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 & value2);
  });

  it("should perform bitwise OR on encrypted values", async function () {
    const value1 = 0b1010;
    const value2 = 0b1100;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.bitwiseOrSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 | value2);
  });

  it("should perform bitwise XOR on encrypted values", async function () {
    const value1 = 0b1010;
    const value2 = 0b1100;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.bitwiseXorSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 ^ value2);
  });

  it("should perform shift right on encrypted values", async function () {
    const value1 = 0b1000;
    const value2 = 2;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.shiftRightSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 >> value2);
  });

  it("should perform shift left on encrypted values", async function () {
    const value1 = 0b0001;
    const value2 = 2;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.shiftLeftSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(value1 << value2);
  });

  it("should compare equality of encrypted values", async function () {
    const value1 = 42;
    const value2 = 42;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.equalSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Boolean(Number(decryptedResult))).to.equal(value1 === value2);
  });

  it("should compare greater than of encrypted values", async function () {
    const value1 = 50;
    const value2 = 30;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.greaterThanSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Boolean(Number(decryptedResult))).to.equal(value1 > value2);
  });

  it("should find minimum of encrypted values", async function () {
    const value1 = 75;
    const value2 = 60;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.minSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(Math.min(value1, value2));
  });

  it("should find maximum of encrypted values", async function () {
    const value1 = 75;
    const value2 = 60;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    const encryptedValue2 = await client.encrypt_uint32(value2);
    
    await basicFHE.setValue1(encryptedValue1);
    await basicFHE.setValue2(encryptedValue2);
    
    const sealedResult = await basicFHE.maxSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    expect(Number(decryptedResult)).to.equal(Math.max(value1, value2));
  });

  it("should perform NOT operation on encrypted value", async function () {
    const value1 = 0b1010;
    
    const encryptedValue1 = await client.encrypt_uint32(value1);
    
    await basicFHE.setValue1(encryptedValue1);
    
    const sealedResult = await basicFHE.notSealed(permission);
    const decryptedResult = await client.unseal(contractAddress, sealedResult);
    
    // Convert the uint32 result to int32
    const int32Result = new Int32Array(new Uint32Array([Number(decryptedResult)]).buffer)[0];
    
    expect(int32Result).to.equal(~value1);
  });
});