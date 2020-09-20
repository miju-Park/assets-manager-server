const axios = require('axios');
const jwt = require('jsonwebtoken')
const APP_SECRET = 'GraphQL-is-aw3some'
const moment = require('moment')

const USD_STOCK_URL = 'https://www.alphavantage.co/query'

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

function getStockBalance(price, count) {
  return price * count;
}

module.exports = {
  APP_SECRET,
  CURRENCY,
  ASSETS_TYPE,
  getUserId,
  getSavingAccountBalance,
  getCurrentUSStockPrice,
  getStockBalance
}