import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyERC20Module = buildModule("MyERC20Module", (m) => {

    const erc20 = m.contract("MyERC20");

    return { erc20 };
});

export default MyERC20Module;