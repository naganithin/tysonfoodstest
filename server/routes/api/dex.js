const express = require('express');
const ethers = require('ethers');
require('dotenv').config();
const app = express();
const port = 3000;

// BSC provider
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://bsc-mainnet.infura.io/v3/${INFURA_API_KEY}`);

// PancakeSwap V2 Factory contract details
const FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const factoryAbi = [
  'function allPairs(uint256) view returns (address)',
  'function allPairsLength() view returns (uint256)',
];
const pairAbi = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112, uint112, uint32)',
  'function totalSupply() view returns (uint256)',
];
const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);

// Middleware
app.use(express.json());

// Endpoint to fetch trading pairs
app.get('/pancake-pairs', async (req, res) => {
  try {
    const pairCount = await factory.allPairsLength();
    const limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 10, Number(pairCount));
    const pairs = [];

    // Fetch pair data
    for (let i = 0; i < limit; i++) {
      const pairAddress = await factory.allPairs(i);
      const pair = new ethers.Contract(pairAddress, pairAbi, provider);

      const [token0, token1, reserves, totalSupply] = await Promise.all([
        pair.token0(),
        pair.token1(),
        pair.getReserves(),
        pair.totalSupply(),
      ]);

      pairs.push({
        pairAddress,
        token0,
        token1,
        reserves: {
          token0: reserves[0].toString(),
          token1: reserves[1].toString(),
        },
        totalSupply: totalSupply.toString(),
      });
    }

    res.json({
      status: 'success',
      data: pairs,
      totalPairs: pairCount.toString(),
      dex: 'PancakeSwap V2 (BSC)',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch pairs' });
  }
});
