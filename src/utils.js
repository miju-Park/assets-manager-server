const axios = require('axios');
const jwt = require('jsonwebtoken')
const APP_SECRET = 'GraphQL-is-aw3some'
const moment = require('moment')
const iconv = require('iconv-lite');
const {
  setting
} = require('./resolvers/Query');

const USD_STOCK_URL = 'https://www.alphavantage.co/query';
const EXCHANGE_RATE_URL = 'https://www.koreaexim.go.kr/site/program/financial/exchangeJSON'
const NAVER_FINANCE_URL = 'https://polling.finance.naver.com/api/realtime.nhn'

const CURRENCY = Object.freeze({
  KR: 0,
  USD: 1
});


const ASSETS_TYPE = Object.freeze({
  CheckingAccount: 'CheckingAccount', //예금
  SavingAccount: 'SavingAccount', //적금
  USDStock: 'USDStock', //해외주식
  RealAssets: 'RealAssets', //부동산
  CMA: 'CMA',
  KRStock: 'KRStock', //국내주식
  IRP: 'IRP',
  PersonalPension: 'PersonalPension', //개인연금

});

const getNearWeeksday = (formatString) => {
  const today = moment();
  const weekday = today.isoWeekday();
  if (weekday === 6) {
    return today.subtract(1, 'days').format(formatString)
  } else if (weekday === 7) {
    return today.subtract(2, 'days').format(formatString)
  }
  return today.format(formatString)
}


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
  const stockInfo = data['Global Quote'];
  for (const key of Object.keys(stockInfo)) {
    if (key.includes('price')) {
      return parseFloat(stockInfo[key])
    }
  }
  return 0;
}
async function getCurrentKRStockPrice(ticker) {
  const {
    data
  } = await axios.get(NAVER_FINANCE_URL, {
    params: {
      query: `SERVICE_ITEM:${ticker}`
    },
    responseType: 'arraybuffer'
  })
  const contents = JSON.parse(iconv.decode(data, 'EUC-KR').toString())
  return contents.result.areas[0].datas[0].nv || 0;
}

async function getCurrentExchangeRate() {
  const {
    data: lists
  } = await axios(EXCHANGE_RATE_URL, {
    params: {
      authkey: 'VF8lFryVkf054uNloFZFNYu1727wgGkV',
      searchdate: getNearWeeksday('YYYYMMDD'),
      data: 'AP01'
    }
  });
  if (lists.length === 0) {
    return 1;
  }
  const usd = lists.find(item => item.cur_unit === 'USD')
  if (usd.deal_bas_r) {
    const exchangeRate = usd.deal_bas_r.replace(/,/g, '') * 1
    return exchangeRate;
  }
  return 1;
}

async function getStockBalance(currency, price, count, exchangeRate) {
  if (currency === CURRENCY.KR) {
    return price * count
  }
  return price * count * exchangeRate;
}

function isStock(type) {
  return type === ASSETS_TYPE.USDStock ||
    type === ASSETS_TYPE.KRStock ||
    type === ASSETS_TYPE.IRP ||
    type === ASSETS_TYPE.PersonalPension
}

async function renewSettingInfo(setting) {
  if (!setting ||
    moment(setting.updatedAt).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD')) {
    const exchangeRate = await getCurrentExchangeRate();
    if (exchangeRate === 1) {
      return null;
    }
    return {
      updatedAt: new Date(getNearWeeksday('YYYY-MM-DD')),
      exchangeRate
    }
  }
  return null;
}

module.exports = {
  APP_SECRET,
  CURRENCY,
  ASSETS_TYPE,
  getUserId,
  getSavingAccountBalance,
  getCurrentUSStockPrice,
  getStockBalance,
  getCurrentKRStockPrice,
  renewSettingInfo,
  getCurrentExchangeRate,
  isStock
}