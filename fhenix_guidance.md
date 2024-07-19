# FHENIX Quick Reference Guide

## Key Concepts

- FHE (Fully Homomorphic Encryption) enables computations on encrypted data
- Use `inEuintXX`, `inEbool`, `inEaddress` for input; `euintXX`, `ebool`, `eaddress` for processed data
- Convert input types using `FHE.asEuintXX`, `FHE.asEbool`, `FHE.asEaddress`

## Installation

```bash
npm install @fhenixprotocol/contracts
npm install fhenixjs
```

## Data Types

| Input Types  | Processed Types | Description                 |
| ------------ | --------------- | --------------------------- |
| inEuint8-256 | euint8-256      | Encrypted unsigned integers |
| inEbool      | ebool           | Encrypted boolean           |
| inEaddress   | eaddress        | Encrypted address           |

## Core Functions (Solidity)

- `asEuint`, `asEbool`, `asEaddress`: Convert to encrypted types
- `decrypt`: Decrypt data (use cautiously)
- `sealOutput`: Seal output for specific address
- Arithmetic: `add`, `sub`, `mul`, `div`, `rem`
- Comparison: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
- Bitwise: `and`, `or`, `xor`, `shl`, `shr`
- Others: `min`, `max`, `not`, `select`, `req`

## Client-Side Encryption with fhenix.js

1. Initialize the FhenixClient:

```typescript
import { FhenixClient } from "fhenixjs";
import { BrowserProvider } from "ethers";

const provider = new BrowserProvider(window.ethereum);
const client = new FhenixClient({ provider });
```

2. Encrypt data using the client:

```typescript
import { FhenixClient, EncryptedType, EncryptedUint8 } from "fhenixjs";

// Generic encryption function
let result: EncryptedUint8 = await client.encrypt(number, EncryptionTypes.uint8);
// Available types: uint8, uint16, uint32, uint64, uint128, uint256, address

// Type-specific encryption functions
const resultUint8 = await client.encrypt_uint8(number);
const resultUint16 = await client.encrypt_uint16(number);
const resultUint32 = await client.encrypt_uint32(number);
const resultUint64 = await client.encrypt_uint64(number);
const resultUint128 = await client.encrypt_uint128(number);
const resultUint256 = await client.encrypt_uint256(number);
const resultAddress = await client.encrypt_address(address);
```

Encrypted results are of type `EncryptedUint8`, `EncryptedUint16`, etc., extending `EncryptedNumber`:

```typescript
export interface EncryptedNumber {
  data: Uint8Array;
}

export interface EncryptedUint8 extends EncryptedNumber {}
```

## Usage Examples (Solidity)

```solidity
// Input handling
function transfer(address to, inEuint32 amount) public {
    _updateBalance(to, FHE.asEuint32(amount));
}

// Operations
euint8 a = FHE.asEuint8(5);
euint8 b = FHE.asEuint8(3);
euint8 sum = a + b;
ebool isGreater = a.gt(b);

// Conditional logic
euint8 result = FHE.select(isGreater, a, b);
```

## Best Practices

1. Use structured types (`inEuintXX`) over raw bytes
2. Minimize on-chain storage of encrypted data
3. Re-encrypt values to prevent leakage
4. Use `FHE.req()` cautiously in transactions
5. Limit `FHE.decrypt()` usage to view functions or final reveal

## Gas Considerations

- Gas limit: 50 million per transaction
- 75% discount for data over 64KB
- FHE operations have varying gas costs (see full table in documentation)

## Limitations

- Comparison operations use functions (e.g., `gt`, `lt`) instead of operators
- `ebool` is implemented as `euint8`
- Division and Remainder by 0 return max value for the uint type

## Advanced Topics

- Trivial Encryption: `FHE.asEuint*(PLAINTEXT_NUMBER)` is deterministic
- Default `euint*` value is 0
- Performance optimization: Consider using bitwise operations for certain calculations

For detailed gas costs, full API reference, and advanced usage, refer to the complete documentation.
