import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// const validSigners = [
//     "0x241791B1BABc46FDD35fFa6447bb347B6a59b9aa",
//     "0xB96190E6b807ff0b3575832d26BFF8F91B040af1",
//     "0xf9eA3AAD18dd4E2F5f1849CE546532F2de1cfaF0"
// ];

// const quorum = 2;

const MultisigFactoryModule = buildModule("MultisigFactoryModule", (m) => {

    const multisigFactory = m.contract("MultisigFactory");

    return { multisigFactory };
});

export default MultisigFactoryModule;