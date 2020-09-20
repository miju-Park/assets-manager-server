const jwt = require('jsonwebtoken')
const APP_SECRET = 'GraphQL-is-aw3some'
const moment = require('moment')

const CURRENCY = Object.freeze({
  KR: 0,
  USD: 1
});
const ASSETS_TYPE = Object.freeze({
  CheckingAccount: 'CheckingAccount',
  SavingAccount: 'SavingAccount'
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

module.exports = {
  APP_SECRET,
  CURRENCY,
  ASSETS_TYPE,
  getUserId,
  getSavingAccountBalance
}