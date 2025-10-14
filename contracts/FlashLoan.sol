// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.6.6;

// Uniswap interface and library imports
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IERC20.sol";
import "./libraries/UniswapV2Library.sol";
import "./libraries/SafeERC20.sol";
import "hardhat/console.sol";

interface IUniswapV2Callee {
    function uniswapV2Call(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external;
}

contract FlashLoan is IUniswapV2Callee {
    using SafeERC20 for IERC20;
    // Factory and Routing Addresses

    address private constant UNISWAP_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address private constant UNISWAP_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    // Token Addresses
    address private constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address private constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;

    uint256 private deadline = block.timestamp + 1 days;
    uint256 private constant MAX_INT = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

    function checkResult(uint256 _repayAmount, uint256 _acquiredCoin) private pure returns (bool) {
        return _acquiredCoin > _repayAmount;
    }

    // GET CONTRACT BALANCE
    // Allows public view of balance for contract
    function getBalanceOfToken(address _address) public view returns (uint256) {
        return IERC20(_address).balanceOf(address(this));
    }

    function placeTrade(address _fromToken, address _toToken, uint256 _amountIn) private returns (uint256) {
        address pair = IUniswapV2Factory(UNISWAP_FACTORY).getPair(_fromToken, _toToken);
        require(pair != address(0), "Pool does not exist");

        // Calculate Amount Out
        address[] memory path = new address[](2);
        path[0] = _fromToken;
        path[1] = _toToken;

        uint256 amountRequired = IUniswapV2Router01(UNISWAP_ROUTER).getAmountsOut(_amountIn, path)[1];

        uint256 amountReceived = IUniswapV2Router01(UNISWAP_ROUTER).swapExactTokensForTokens(
            _amountIn, amountRequired, path, address(this), deadline
        )[1];

        require(amountReceived > 0, "Transaction Abort");

        return amountReceived;
    }

    function initateArbitrage(address _usdcBorrow, uint256 _amount) external {
        IERC20(USDC).safeApprove(address(UNISWAP_ROUTER), MAX_INT);
        IERC20(LINK).safeApprove(address(UNISWAP_ROUTER), MAX_INT);
        IERC20(UNI).safeApprove(address(UNISWAP_ROUTER), MAX_INT);

        //liquidity pool of USDC and WETH
        address pair = IUniswapV2Factory(UNISWAP_FACTORY).getPair(_usdcBorrow, WETH);

        require(pair != address(0), "Pool does not exist");

        address token0 = IUniswapV2Pair(pair).token0(); //WETH
        address token1 = IUniswapV2Pair(pair).token1(); //USDC

        uint256 amount0Out = _usdcBorrow == token0 ? _amount : 0;
        uint256 amount1Out = _usdcBorrow == token1 ? _amount : 0; //USDC Amount

        bytes memory data = abi.encode(_usdcBorrow, _amount, msg.sender);
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), data);
    }

    function uniswapV2Call(address _sender, uint256 _amount0, uint256 _amount1, bytes calldata _data)
        external
        override
    {
        // Ensure this request came from the contract
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        address pair = IUniswapV2Factory(UNISWAP_FACTORY).getPair(token0, token1);
        require(msg.sender == pair, "The sender needs to match the pair");
        require(_sender == address(this), "Sender should match the contract");

        // Decode data for calculating the repayment
        (address busdBorrow, uint256 amount, address myAddress) = abi.decode(_data, (address, uint256, address));

        // Calculate the amount to repay at the end
        uint256 fee = ((amount * 3) / 997) + 1;
        uint256 repayAmount = amount + fee;

        // DO ARBITRAGE

        // Assign loan amount
        uint256 loanAmount = _amount0 > 0 ? _amount0 : _amount1;

        // Place Trades
        uint256 trade1Coin = placeTrade(USDC, LINK, loanAmount);
        uint256 trade2Coin = placeTrade(LINK, UNI, trade1Coin);
        uint256 trade3Coin = placeTrade(UNI, USDC, trade2Coin);
        console.log("loanAmount:", loanAmount);
        console.log("Arbitrage Results:");
        console.log("Trade 1 (USDC -> LINK):", trade1Coin);
        console.log("Trade 2 (LINK -> UNI):", trade2Coin);
        console.log("Trade 3 (UNI -> USDC):", trade3Coin);
        // Check Profitability
        bool profCheck = checkResult(repayAmount, trade3Coin);
        require(profCheck, "Arbitrage not profitable");

        // Pay Myself
        IERC20 otherToken = IERC20(USDC);
        otherToken.transfer(myAddress, trade3Coin - repayAmount);

        // Pay Loan Back
        IERC20(busdBorrow).transfer(pair, repayAmount);
    }
}
