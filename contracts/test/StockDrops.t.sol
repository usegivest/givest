// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StockDrops, IERC20, IWETH, ISwapRouter, IPoolManager} from "../src/StockDrops.sol";

/// Fork tests against Robinhood Chain mainnet. Run with:
///   forge test --fork-url https://rpc.mainnet.chain.robinhood.com
contract StockDropsForkTest is Test {
    IWETH constant WETH = IWETH(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73);
    ISwapRouter constant ROUTER = ISwapRouter(0xCaf681a66D020601342297493863E78C959E5cb2);
    IPoolManager constant POOL_MANAGER = IPoolManager(0x8366a39CC670B4001A1121B8F6A443A643e40951);
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;

    StockDrops drops;
    bytes nvdaPath;
    address feeSink = makeAddr("feeSink");
    MockGivest givest;

    uint256 claimPk = 0xA11CE;
    address claimKey;
    address sender = makeAddr("sender");
    address recipient = makeAddr("recipient");
    address recipient2 = makeAddr("recipient2");
    address relayer = makeAddr("relayer");

    function setUp() public {
        drops = new StockDrops(WETH, ROUTER, POOL_MANAGER, feeSink);
        givest = new MockGivest();
        claimKey = vm.addr(claimPk);
        vm.deal(sender, 2 ether);
        vm.deal(relayer, 1 ether);
        nvdaPath = abi.encodePacked(address(WETH), uint24(500), USDG, uint24(3000), NVDA);
    }

    function _sign(address recipientAddr) internal view returns (bytes memory) {
        bytes32 digest = drops.claimDigest(claimKey, recipientAddr);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _createEthDrop() internal returns (uint256 amount) {
        uint40 now_ = uint40(block.timestamp);
        vm.prank(sender);
        drops.createDropWithEth{value: 0.001 ether}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, now_, 1
        );
        (,, uint128 amt,,,,,,) = drops.drops(claimKey);
        return amt;
    }

    function test_createWithEth_swapsToStock() public {
        uint256 amount = _createEthDrop();
        assertGt(amount, 0, "swap produced no NVDA");
        assertEq(IERC20(NVDA).balanceOf(address(drops)), amount);
    }

    function test_claim_byRelayer_paysRecipient() public {
        uint256 amount = _createEthDrop();
        bytes memory sig = _sign(recipient);

        vm.prank(relayer);
        drops.claim(claimKey, recipient, sig);

        assertEq(IERC20(NVDA).balanceOf(recipient), amount);
        (,,,,,,,, uint8 status) = drops.drops(claimKey);
        assertEq(status, 2);
    }

    function test_claim_rejectsWrongRecipientWithStolenSig() public {
        _createEthDrop();
        bytes memory sig = _sign(recipient);

        vm.prank(relayer);
        vm.expectRevert(StockDrops.BadSignature.selector);
        drops.claim(claimKey, makeAddr("attacker"), sig);
    }

    function test_claim_rejectsDoubleClaim() public {
        _createEthDrop();
        bytes memory sig = _sign(recipient);
        vm.prank(relayer);
        drops.claim(claimKey, recipient, sig);

        vm.prank(relayer);
        vm.expectRevert(StockDrops.DropNotActive.selector);
        drops.claim(claimKey, recipient, sig);
    }

    function test_split_tenWinnersEqualShares() public {
        uint40 now_ = uint40(block.timestamp);
        vm.prank(sender);
        drops.createDropWithEth{value: 0.01 ether}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, now_, 10
        );
        (,, uint128 remaining, uint128 perClaim,,, uint16 maxClaims, uint16 made,) =
            drops.drops(claimKey);
        assertEq(maxClaims, 10);
        assertEq(made, 0);
        assertEq(perClaim, remaining / 10);

        // First claim
        vm.prank(relayer);
        drops.claim(claimKey, recipient, _sign(recipient));
        assertEq(IERC20(NVDA).balanceOf(recipient), perClaim);

        // Same wallet cannot claim twice
        assertTrue(drops.hasClaimed(claimKey, recipient));
        bytes memory sigAgain = _sign(recipient);
        vm.prank(relayer);
        vm.expectRevert(StockDrops.AlreadyClaimed.selector);
        drops.claim(claimKey, recipient, sigAgain);

        // Second winner
        vm.prank(relayer);
        drops.claim(claimKey, recipient2, _sign(recipient2));
        assertEq(IERC20(NVDA).balanceOf(recipient2), perClaim);

        (,, uint128 left,,,,, uint16 made2, uint8 status) = drops.drops(claimKey);
        assertEq(made2, 2);
        assertEq(status, 1);
        assertEq(left, remaining - perClaim * 2);
    }

    function test_refund_senderCancelsAnytime() public {
        uint256 amount = _createEthDrop();
        vm.prank(sender);
        drops.refund(claimKey);
        assertEq(IERC20(NVDA).balanceOf(sender), amount);
    }

    function test_refund_rejectsNonSender() public {
        _createEthDrop();
        vm.prank(relayer);
        vm.expectRevert(StockDrops.NotSender.selector);
        drops.refund(claimKey);
    }

    function test_refundExpired_anyoneAfterExpiry() public {
        uint256 amount = _createEthDrop();

        vm.prank(relayer);
        vm.expectRevert(StockDrops.DropNotExpired.selector);
        drops.refundExpired(claimKey);

        vm.warp(block.timestamp + 31 days);
        vm.prank(relayer);
        drops.refundExpired(claimKey);
        assertEq(IERC20(NVDA).balanceOf(sender), amount);
    }

    function test_claim_rejectsAfterExpiry() public {
        _createEthDrop();
        bytes memory sig = _sign(recipient);
        vm.warp(block.timestamp + 31 days);

        vm.prank(relayer);
        vm.expectRevert(StockDrops.DropExpired.selector);
        drops.claim(claimKey, recipient, sig);
    }

    function test_giveaway_claimLockedUntilClaimableAt() public {
        uint40 now_ = uint40(block.timestamp);
        uint40 unlockAt = now_ + 2 minutes;
        vm.prank(sender);
        drops.createDropWithEth{value: 0.001 ether}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, unlockAt, 1
        );

        bytes memory sig = _sign(recipient);
        vm.prank(relayer);
        vm.expectRevert(StockDrops.NotYetClaimable.selector);
        drops.claim(claimKey, recipient, sig);

        vm.warp(unlockAt);
        vm.prank(relayer);
        drops.claim(claimKey, recipient, sig);
        (,,,,,,,, uint8 status) = drops.drops(claimKey);
        assertEq(status, 2);
    }

    function test_createDrop_fromHeldTokens() public {
        uint40 now_ = uint40(block.timestamp);
        vm.startPrank(sender);
        WETH.deposit{value: 0.001 ether}();
        WETH.approve(address(ROUTER), 0.001 ether);
        uint256 amount = ROUTER.exactInput(
            ISwapRouter.ExactInputParams({
                path: nvdaPath,
                recipient: sender,
                amountIn: 0.001 ether,
                amountOutMinimum: 0
            })
        );
        IERC20(NVDA).approve(address(drops), amount);
        drops.createDrop(claimKey, NVDA, amount, now_ + 7 days, now_, 1);
        vm.stopPrank();

        (address dropSender,, uint128 amt,,,,,, uint8 status) = drops.drops(claimKey);
        (uint256 net, uint256 feeAmt) = drops.splitGross(amount, 100);
        assertEq(dropSender, sender);
        assertEq(amt, uint128(net));
        assertEq(status, 1);
        assertEq(IERC20(NVDA).balanceOf(feeSink), feeAmt);
    }

    function test_protocolFee_ethGoesToFeeRecipient() public {
        uint256 before = feeSink.balance;
        uint40 now_ = uint40(block.timestamp);
        uint256 value = 0.001 ether;
        vm.prank(sender);
        drops.createDropWithEth{value: value}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, now_, 1
        );
        // 1% of gross ≈ value * 100 / 10100
        uint256 expectedFee = value - (value * 10_000) / 10_100;
        assertEq(feeSink.balance - before, expectedFee);
    }

    function test_protocolFee_waivedAt100kHold() public {
        drops.setGivestToken(address(givest));
        givest.mint(sender, 100_000 ether);

        uint256 before = feeSink.balance;
        uint40 now_ = uint40(block.timestamp);
        vm.prank(sender);
        drops.createDropWithEth{value: 0.001 ether}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, now_, 1
        );
        assertEq(feeSink.balance, before, "VIP should pay 0 fee");
        assertEq(drops.feeBpsFor(sender), 0);
    }

    function test_protocolFee_tier1At10kHold() public {
        drops.setGivestToken(address(givest));
        givest.mint(sender, 10_000 ether);
        assertEq(drops.feeBpsFor(sender), 75);

        uint256 before = feeSink.balance;
        uint256 value = 0.001 ether;
        uint40 now_ = uint40(block.timestamp);
        vm.prank(sender);
        drops.createDropWithEth{value: value}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, now_, 1
        );
        uint256 expectedFee = value - (value * 10_000) / 10_075;
        assertEq(feeSink.balance - before, expectedFee);
    }

    function test_register_rejectsReusedClaimKey() public {
        _createEthDrop();
        uint40 now_ = uint40(block.timestamp);
        vm.deal(sender, 1 ether);
        vm.prank(sender);
        vm.expectRevert(StockDrops.DropExists.selector);
        drops.createDropWithEth{value: 0.001 ether}(
            claimKey, NVDA, nvdaPath, 0, now_ + 30 days, now_, 1
        );
    }

    function test_createWithEthV4_swapsAapl() public {
        uint40 now_ = uint40(block.timestamp);
        vm.prank(sender);
        drops.createDropWithEthV4{value: 0.001 ether}(
            claimKey, AAPL, 50000, 1000, address(0), 0, now_ + 30 days, now_, 1
        );
        (,, uint128 amt,,,,,,) = drops.drops(claimKey);
        assertGt(amt, 0, "V4 swap produced no AAPL");
        assertEq(IERC20(AAPL).balanceOf(address(drops)), amt);
    }

    function test_createWithEthViaUsdgV4_swapsMsft() public {
        address MSFT = 0xe93237C50D904957Cf27E7B1133b510C669c2e74;
        uint40 now_ = uint40(block.timestamp);
        bytes memory ethToUsdg = abi.encodePacked(address(WETH), uint24(500), USDG);
        vm.prank(sender);
        drops.createDropWithEthViaUsdgV4{value: 0.001 ether}(
            claimKey,
            MSFT,
            USDG,
            ethToUsdg,
            500,
            10,
            address(0),
            0,
            now_ + 30 days,
            now_,
            1
        );
        (,, uint128 amt,,,,,,) = drops.drops(claimKey);
        assertGt(amt, 0, "V3+V4 via USDG produced no MSFT");
        assertEq(IERC20(MSFT).balanceOf(address(drops)), amt);
    }
}

contract MockGivest {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] = amount;
    }
}
