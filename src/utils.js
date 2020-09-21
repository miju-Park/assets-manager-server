const axios = require('axios');
const jwt = require('jsonwebtoken')
const APP_SECRET = 'GraphQL-is-aw3some'
const moment = require('moment')

const USD_STOCK_URL = 'https://www.alphavantage.co/query';
const EXCHANGE_RATE_URL = 'https://www.koreaexim.go.kr/site/program/financial/exchangeJSON'

const CURRENCY = Object.freeze({
  KR: 0,
  USD: 1
});
const ASSETS_TYPE = Object.freeze({
  CheckingAccount: 'CheckingAccount',
  SavingAccount: 'SavingAccount',
  USDStock: 'USDStock'
});


function getUserId(context) {
  const Authorization = context.request.get('Authorization')
  if (Authorization) {
    const token = Authorization.replace('Bearer ', '')
    const {
      userId
    } = jwt.verify(token, APP_SECRET)
    return userId
  }

  throw new Error('Not authenticated')
}

function getSavingAccountBalance(startdate, enddate, initial, payment) {
  return initial + (moment(enddate).diff(moment(startdate), 'month') * payment);
}

async function getCurrentUSStockPrice(ticker) {
  const {
    data
  } = await axios(USD_STOCK_URL, {
    params: {
      function: 'GLOBAL_QUOTE',
      symbol: ticker,
      apikey: 'X78V2FB1CC0PJ7TV'
    }
  });
  const stockInfo = data['Global Quote']
  for (const key of Object.keys(stockInfo)) {
    if (key.includes('price')) {
      return parseFloat(stockInfo[key])
    }
  }
  return 0;
}

async function getCurrentExchangeRate() {
  const {
    data: lists
  } = await axios(EXCHANGE_RATE_URL, {
    params: {
      authkey: 'VF8lFryVkf054uNloFZFNYu1727wgGkV',
      searchdate: moment().format('YYYYMMDD'),
      data: 'AP01'
    }
  });
  const usd = lists.find(item => item.cur_unit === 'USD')
  if (usd.deal_bas_r) {
    return usd.deal_bas_r.replace(/,/g, '')
  }
  return 1;
}

async function getUSDStockBalance(price, count) {
  const exchangeRate = await getCurrentExchangeRate();
  return price * count * exchangeRate;
}

module.exports = {
  APP_SECRET,
  CURRENCY,
  ASSETS_TYPE,
  getUserId,
  getSavingAccountBalance,
  getCurrentUSStockPrice,
  getUSDStockBalance
}