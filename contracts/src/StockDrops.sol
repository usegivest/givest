// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IWETH is IERC20 {
    function deposit() external payable;
}

interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

interface IHooks {}

type Currency is address;

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    IHooks hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

type BalanceDelta is int256;

library BalanceDeltaLibrary {
    function amount0(BalanceDelta delta) internal pure returns (int128 out) {
        assembly ("memory-safe") {
            out := sar(128, delta)
        }
    }

    function amount1(BalanceDelta delta) internal pure returns (int128 out) {
        assembly ("memory-safe") {
            out := signextend(15, delta)
        }
    }
}

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (BalanceDelta);
    function take(Currency currency, address to, uint256 amount) external;
    function sync(Currency currency) external;
    function settle() external payable returns (uint256);
}

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

/// @title StockDrops - send stock tokens as a claimable link on Robinhood Chain.
/// @notice A drop locks stock tokens in escrow, keyed by a one-time "claim key"
///         (an address whose private key lives only in the shared link). Claiming
///         requires a signature from that key over the recipient address, so any
///         relayer can submit the transaction and pay gas on the recipient's behalf.
contract StockDrops is IUnlockCallback {
    using BalanceDeltaLibrary for BalanceDelta;

    struct Drop {
        address sender;
        address token;
        /// @dev Remaining tokens still in escrow.
        uint128 amount;
        /// @dev Fixed payout per successful claim.
        uint128 amountPerClaim;
        uint40 expiresAt;
        /// @dev Unix timestamp when claiming opens. Use `block.timestamp` (or earlier) for instant drops.
        uint40 claimableAt;
        uint16 maxClaims;
        uint16 claimsMade;
        uint8 status; // 0 = none, 1 = active, 2 = fully claimed, 3 = refunded
    }

    uint8 private constant STATUS_ACTIVE = 1;
    uint8 private constant STATUS_CLAIMED = 2;
    uint8 private constant STATUS_REFUNDED = 3;

    /// Uniswap V4 sqrt price limits (TickMath ± 1).
    uint160 private constant MIN_SQRT_PRICE_LIMIT = 4295128740;
    uint160 private constant MAX_SQRT_PRICE_LIMIT =
        1461446703485210103287273052203988822378723970341;

    IWETH public immutable weth;
    ISwapRouter public immutable swapRouter;
    IPoolManager public immutable poolManager;

    /// claim key address => drop
    mapping(address => Drop) public drops;
    /// claim key => recipient => already claimed
    mapping(address => mapping(address => bool)) public hasClaimed;

    address public owner;
    /// @dev Receives protocol fees (treasury / relayer funding). Not the claim-key wallet.
    address public feeRecipient;
    /// @dev Givest token used for holder fee discounts. `address(0)` = no discount yet.
    address public givestToken;

    /// @dev Default create fee: 1.00%.
    uint16 public baseFeeBps = 100;
    /// @dev Hold ≥ tier1 → 0.75%.
    uint256 public tier1Threshold = 10_000 ether;
    uint16 public tier1FeeBps = 75;
    /// @dev Hold ≥ tier2 → 0% (VIP).
    uint256 public tier2Threshold = 100_000 ether;
    uint16 public tier2FeeBps = 0;

    event DropCreated(
        address indexed claimKey,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint128 amountPerClaim,
        uint16 maxClaims,
        uint40 expiresAt,
        uint40 claimableAt
    );
    event DropClaimed(
        address indexed claimKey,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint16 claimsMade,
        uint16 maxClaims
    );
    event DropRefunded(address indexed claimKey, address indexed sender, address indexed token, uint256 amount);
    /// @param token `address(0)` when the fee was paid in native ETH.
    event ProtocolFeePaid(
        address indexed payer, address indexed token, address indexed recipient, uint256 amount, uint16 bps
    );
    event FeeConfigUpdated(
        uint16 baseFeeBps,
        uint256 tier1Threshold,
        uint16 tier1FeeBps,
        uint256 tier2Threshold,
        uint16 tier2FeeBps
    );
    event FeeRecipientUpdated(address indexed recipient);
    event GivestTokenUpdated(address indexed token);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error DropExists();
    error DropNotActive();
    error DropExpired();
    error DropNotExpired();
    error NotYetClaimable();
    error AlreadyClaimed();
    error NoClaimsLeft();
    error NotSender();
    error BadSignature();
    error ZeroAmount();
    error BadExpiry();
    error BadClaimable();
    error BadSplits();
    error OnlyPoolManager();
    error Slippage(uint256 out, uint256 minOut);
    error BadToken();
    error NotOwner();
    error BadFeeRecipient();
    error BadFeeBps();
    error FeeTransferFailed();

    constructor(IWETH _weth, ISwapRouter _swapRouter, IPoolManager _poolManager, address _feeRecipient) {
        if (_feeRecipient == address(0)) revert BadFeeRecipient();
        weth = _weth;
        swapRouter = _swapRouter;
        poolManager = _poolManager;
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    receive() external payable {}

    /// @notice Protocol fee in bps for `account` based on Givest holdings.
    function feeBpsFor(address account) public view returns (uint16) {
        if (givestToken == address(0)) return baseFeeBps;
        uint256 bal = IERC20(givestToken).balanceOf(account);
        if (bal >= tier2Threshold) return tier2FeeBps;
        if (bal >= tier1Threshold) return tier1FeeBps;
        return baseFeeBps;
    }

    /// @notice Split a gross payment into (net for drop, fee). Gross = net + net*bps/10000.
    function splitGross(uint256 gross, uint16 bps) public pure returns (uint256 net, uint256 feeAmt) {
        if (bps == 0) return (gross, 0);
        net = (gross * 10_000) / (10_000 + uint256(bps));
        feeAmt = gross - net;
    }

    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert BadFeeRecipient();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setGivestToken(address token) external onlyOwner {
        givestToken = token;
        emit GivestTokenUpdated(token);
    }

    function setFeeConfig(
        uint16 _baseFeeBps,
        uint256 _tier1Threshold,
        uint16 _tier1FeeBps,
        uint256 _tier2Threshold,
        uint16 _tier2FeeBps
    ) external onlyOwner {
        if (_baseFeeBps > 1_000 || _tier1FeeBps > 1_000 || _tier2FeeBps > 1_000) revert BadFeeBps();
        if (_tier2Threshold < _tier1Threshold) revert BadFeeBps();
        baseFeeBps = _baseFeeBps;
        tier1Threshold = _tier1Threshold;
        tier1FeeBps = _tier1FeeBps;
        tier2Threshold = _tier2Threshold;
        tier2FeeBps = _tier2FeeBps;
        emit FeeConfigUpdated(
            _baseFeeBps, _tier1Threshold, _tier1FeeBps, _tier2Threshold, _tier2FeeBps
        );
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert NotOwner();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Create a drop from stock tokens the sender already holds.
    ///         Requires prior approve() on the token.
    /// @dev `amount` is the gross pull. Protocol fee is taken in the stock token;
    ///      the remainder is escrowed. Pass amount = desiredEscrow * (10000+bps)/10000.
    function createDrop(
        address claimKey,
        address token,
        uint256 amount,
        uint40 expiresAt,
        uint40 claimableAt,
        uint16 splits
    ) external {
        uint16 bps = feeBpsFor(msg.sender);
        (uint256 net, uint256 feeAmt) = splitGross(amount, bps);
        if (net == 0) revert ZeroAmount();
        _requireBalanceIncrease(token, amount);
        if (feeAmt > 0) {
            _safeTransfer(token, feeRecipient, feeAmt);
            emit ProtocolFeePaid(msg.sender, token, feeRecipient, feeAmt, bps);
        }
        _register(claimKey, token, net, expiresAt, claimableAt, splits);
    }

    /// @notice Create a drop paying with native ETH. The ETH is wrapped and swapped
    ///         to the stock token via Uniswap V3 in the same transaction.
    /// @param path Uniswap V3 multihop path starting at WETH and ending at `token`
    ///        (stock tokens route WETH -> USDG -> stock on Robinhood Chain).
    /// @param minOut Slippage floor for the swap, in stock token units.
    /// @dev `msg.value` is gross (gift + protocol fee). Fee is skimmed in ETH first.
    function createDropWithEth(
        address claimKey,
        address token,
        bytes calldata path,
        uint256 minOut,
        uint40 expiresAt,
        uint40 claimableAt,
        uint16 splits
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();
        uint256 ethIn = _takeEthFee(msg.value);

        weth.deposit{value: ethIn}();
        weth.approve(address(swapRouter), ethIn);

        // Measure the balance delta of `token` rather than trusting the router's
        // return value, so a path that doesn't end in `token` cannot fake a drop.
        uint256 before = IERC20(token).balanceOf(address(this));
        swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: address(this),
                amountIn: ethIn,
                amountOutMinimum: minOut
            })
        );
        uint256 amountOut = IERC20(token).balanceOf(address(this)) - before;

        _register(claimKey, token, amountOut, expiresAt, claimableAt, splits);
    }

    /// @notice Create a drop paying with native ETH via Uniswap V4 (ETH -> stock).
    /// @dev Used when a stock has no V3 pool but has a V4 ETH/stock pool (most RH stocks).
    function createDropWithEthV4(
        address claimKey,
        address token,
        uint24 fee,
        int24 tickSpacing,
        address hooks,
        uint256 minOut,
        uint40 expiresAt,
        uint40 claimableAt,
        uint16 splits
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (token == address(0) || token == address(weth)) revert BadToken();
        uint256 ethIn = _takeEthFee(msg.value);

        uint256 before = IERC20(token).balanceOf(address(this));
        poolManager.unlock(abi.encode(uint8(0), token, fee, tickSpacing, hooks, ethIn, minOut));
        uint256 amountOut = IERC20(token).balanceOf(address(this)) - before;
        if (amountOut < minOut) revert Slippage(amountOut, minOut);

        _register(claimKey, token, amountOut, expiresAt, claimableAt, splits);
    }

    /// @notice Create a drop via Uniswap V3 ETH->USDG then Uniswap V4 USDG->stock.
    /// @dev For stocks that only have USDG V4 pools (e.g. MSFT / META).
    function createDropWithEthViaUsdgV4(
        address claimKey,
        address token,
        address usdg,
        bytes calldata ethToUsdgPath,
        uint24 usdgStockFee,
        int24 usdgStockTickSpacing,
        address hooks,
        uint256 minOut,
        uint40 expiresAt,
        uint40 claimableAt,
        uint16 splits
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (token == address(0) || token == address(weth) || usdg == address(0)) revert BadToken();
        uint256 ethIn = _takeEthFee(msg.value);

        weth.deposit{value: ethIn}();
        weth.approve(address(swapRouter), ethIn);

        uint256 usdgBefore = IERC20(usdg).balanceOf(address(this));
        swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: ethToUsdgPath,
                recipient: address(this),
                amountIn: ethIn,
                amountOutMinimum: 0
            })
        );
        uint256 usdgAmt = IERC20(usdg).balanceOf(address(this)) - usdgBefore;
        if (usdgAmt == 0) revert ZeroAmount();

        uint256 before = IERC20(token).balanceOf(address(this));
        poolManager.unlock(abi.encode(uint8(1), token, usdg, usdgStockFee, usdgStockTickSpacing, hooks, usdgAmt, minOut));
        uint256 amountOut = IERC20(token).balanceOf(address(this)) - before;
        if (amountOut < minOut) revert Slippage(amountOut, minOut);

        _register(claimKey, token, amountOut, expiresAt, claimableAt, splits);
    }

    /// @dev Uniswap V4 unlock callback - swaps native ETH for `token` and takes it here.
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();

        uint8 mode = abi.decode(data, (uint8));
        if (mode == 0) {
            (, address token, uint24 fee, int24 tickSpacing, address hooks, uint256 ethIn, uint256 minOut) =
                abi.decode(data, (uint8, address, uint24, int24, address, uint256, uint256));
            _swapEthForStock(token, fee, tickSpacing, hooks, ethIn, minOut);
        } else if (mode == 1) {
            (
                ,
                address token,
                address usdg,
                uint24 usdgStockFee,
                int24 usdgStockTickSpacing,
                address hooks,
                uint256 usdgAmt,
                uint256 minOut
            ) = abi.decode(data, (uint8, address, address, uint24, int24, address, uint256, uint256));
            _swapUsdgForStock(token, usdg, usdgStockFee, usdgStockTickSpacing, hooks, usdgAmt, minOut);
        } else {
            revert BadToken();
        }
        return "";
    }

    function _swapEthForStock(
        address token,
        uint24 fee,
        int24 tickSpacing,
        address hooks,
        uint256 ethIn,
        uint256 minOut
    ) internal {
        // Native ETH is address(0) and always sorts as currency0 against ERC-20s.
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(hooks)
        });

        BalanceDelta delta = poolManager.swap(
            key,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(ethIn),
                sqrtPriceLimitX96: MIN_SQRT_PRICE_LIMIT
            }),
            ""
        );

        int128 outSigned = delta.amount1();
        if (outSigned <= 0) revert ZeroAmount();
        uint256 out = uint256(uint128(outSigned));
        if (out < minOut) revert Slippage(out, minOut);

        poolManager.take(Currency.wrap(token), address(this), out);
        poolManager.settle{value: ethIn}();
    }

    function _swapUsdgForStock(
        address token,
        address usdg,
        uint24 fee,
        int24 tickSpacing,
        address hooks,
        uint256 usdgAmt,
        uint256 minOut
    ) internal {
        bool usdgFirst = uint160(usdg) < uint160(token);
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(usdgFirst ? usdg : token),
            currency1: Currency.wrap(usdgFirst ? token : usdg),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(hooks)
        });

        BalanceDelta delta = poolManager.swap(
            key,
            SwapParams({
                zeroForOne: usdgFirst,
                amountSpecified: -int256(usdgAmt),
                sqrtPriceLimitX96: usdgFirst ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT
            }),
            ""
        );

        int128 a0 = delta.amount0();
        int128 a1 = delta.amount1();

        uint256 out;
        uint256 owed;
        if (usdgFirst) {
            // Sold USDG (currency0), bought stock (currency1).
            if (a0 >= 0 || a1 <= 0) revert ZeroAmount();
            owed = uint256(uint128(-a0));
            out = uint256(uint128(a1));
        } else {
            // Sold USDG (currency1), bought stock (currency0).
            if (a1 >= 0 || a0 <= 0) revert ZeroAmount();
            owed = uint256(uint128(-a1));
            out = uint256(uint128(a0));
        }
        if (out < minOut) revert Slippage(out, minOut);

        poolManager.take(Currency.wrap(token), address(this), out);
        poolManager.sync(Currency.wrap(usdg));
        require(IERC20(usdg).transfer(address(poolManager), owed), "usdg transfer failed");
        poolManager.settle();
    }

    /// @notice Claim a drop to `recipient`. Callable by anyone (e.g. a gas-paying
    ///         relayer) holding a valid signature from the drop's claim key.
    /// @param signature 65-byte ECDSA signature by the claim key over
    ///        keccak256(abi.encodePacked(chainid, address(this), claimKey, recipient)),
    ///        wrapped as an EIP-191 personal message.
    function claim(address claimKey, address recipient, bytes calldata signature) external {
        Drop storage drop = drops[claimKey];
        if (drop.status != STATUS_ACTIVE) revert DropNotActive();
        if (block.timestamp < drop.claimableAt) revert NotYetClaimable();
        if (block.timestamp >= drop.expiresAt) revert DropExpired();
        if (drop.claimsMade >= drop.maxClaims) revert NoClaimsLeft();
        if (hasClaimed[claimKey][recipient]) revert AlreadyClaimed();

        bytes32 digest = claimDigest(claimKey, recipient);
        if (_recover(digest, signature) != claimKey) revert BadSignature();

        uint128 payout = drop.amountPerClaim;
        if (payout == 0 || drop.amount < payout) revert ZeroAmount();

        hasClaimed[claimKey][recipient] = true;
        unchecked {
            drop.claimsMade += 1;
            drop.amount -= payout;
        }
        if (drop.claimsMade == drop.maxClaims) {
            drop.status = STATUS_CLAIMED;
        }

        _safeTransfer(drop.token, recipient, payout);
        emit DropClaimed(
            claimKey, recipient, drop.token, payout, drop.claimsMade, drop.maxClaims
        );
    }

    /// @notice Sender can cancel an active drop anytime and reclaim remaining tokens.
    function refund(address claimKey) external {
        Drop storage drop = drops[claimKey];
        if (drop.status != STATUS_ACTIVE) revert DropNotActive();
        if (msg.sender != drop.sender) revert NotSender();

        uint128 remaining = drop.amount;
        drop.amount = 0;
        drop.status = STATUS_REFUNDED;
        if (remaining > 0) {
            _safeTransfer(drop.token, drop.sender, remaining);
        }
        emit DropRefunded(claimKey, drop.sender, drop.token, remaining);
    }

    /// @notice After expiry anyone may push remaining tokens back to the sender.
    function refundExpired(address claimKey) external {
        Drop storage drop = drops[claimKey];
        if (drop.status != STATUS_ACTIVE) revert DropNotActive();
        if (block.timestamp < drop.expiresAt) revert DropNotExpired();

        uint128 remaining = drop.amount;
        drop.amount = 0;
        drop.status = STATUS_REFUNDED;
        if (remaining > 0) {
            _safeTransfer(drop.token, drop.sender, remaining);
        }
        emit DropRefunded(claimKey, drop.sender, drop.token, remaining);
    }

    /// @notice The EIP-191 digest the claim key must sign to release a drop.
    function claimDigest(address claimKey, address recipient) public view returns (bytes32) {
        bytes32 inner = keccak256(abi.encodePacked(block.chainid, address(this), claimKey, recipient));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
    }

    function _register(
        address claimKey,
        address token,
        uint256 amount,
        uint40 expiresAt,
        uint40 claimableAt,
        uint16 splits
    ) internal {
        if (claimKey == address(0)) revert BadSignature();
        if (drops[claimKey].status != 0) revert DropExists();
        if (amount == 0) revert ZeroAmount();
        if (splits == 0) revert BadSplits();
        if (expiresAt <= block.timestamp) revert BadExpiry();
        if (claimableAt > expiresAt) revert BadClaimable();

        uint128 perClaim = uint128(amount / splits);
        if (perClaim == 0) revert ZeroAmount();

        drops[claimKey] = Drop({
            sender: msg.sender,
            token: token,
            amount: uint128(amount),
            amountPerClaim: perClaim,
            expiresAt: expiresAt,
            claimableAt: claimableAt,
            maxClaims: splits,
            claimsMade: 0,
            status: STATUS_ACTIVE
        });
        emit DropCreated(
            claimKey, msg.sender, token, amount, perClaim, splits, expiresAt, claimableAt
        );
    }

    /// @dev Skim protocol fee from gross ETH, return net amount to swap.
    function _takeEthFee(uint256 gross) internal returns (uint256 net) {
        uint16 bps = feeBpsFor(msg.sender);
        uint256 feeAmt;
        (net, feeAmt) = splitGross(gross, bps);
        if (net == 0) revert ZeroAmount();
        if (feeAmt > 0) {
            (bool ok,) = feeRecipient.call{value: feeAmt}("");
            if (!ok) revert FeeTransferFailed();
            emit ProtocolFeePaid(msg.sender, address(0), feeRecipient, feeAmt, bps);
        }
    }

    /// @dev Pull `amount` from msg.sender, measuring the actual received balance
    ///      so fee-on-transfer tokens cannot under-fund a drop.
    function _requireBalanceIncrease(address token, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        uint256 before = IERC20(token).balanceOf(address(this));
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        require(IERC20(token).balanceOf(address(this)) - before >= amount, "fee-on-transfer");
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "transfer failed");
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }
}
