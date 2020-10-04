const {
	getUserId,
	CURRENCY,
} = require("../utils");
const moment = require('moment')

async function assets(parent, args, context, info) {
	const userId = getUserId(context);
	let filter = {
		ownerId: userId,
		duedate: {
			gt: new Date()
		}
	}
	if (args.filter === 'Cash') {
		filter.type = {
			in: ['CheckingAccount', 'SavingAccount', 'USDStock', 'RealAssets', 'CMA', 'KRStock']
		}
	} else if (args.filter.includes(',')) {
		filter.type = {
			in: args.filter.split(',')
		}
	} else if (args.filter) {
		filter.type = args.filter;
	}
	const assets = await context.prisma.assets.findMany({
		where: filter
	})
	return {
		list: assets,
		total: assets.reduce((sum, asset) => asset.balance + sum, 0),
		currency: CURRENCY.KR
	}
}

async function setting(parent, args, context, info) {
	return await context.prisma.setting.findMany();
}

async function assetsSummary(parent, args, context) {
	const userId = getUserId(context);
	let result;
	if (args.filter === 'Cash') {
		result = await context.prisma.$queryRaw(`SELECT type, sum(balance) total FROM assets 
		WHERE ownerId = ${userId} AND duedate > ${moment().format('YYYY-MM-DD')} AND
		type IN ('CheckingAccount', 'SavingAccount', 'USDStock', 'RealAssets', 'CMA', 'KRStock')
		group by type`)

	} else {
		result = await context.prisma.$queryRaw(`SELECT type, sum(balance) total FROM assets 
		WHERE ownerId = ${userId} AND duedate > ${moment().format('YYYY-MM-DD')} group by type`)
	}

	return {
		list: result,
		total: result.reduce((sum, asset) => parseInt(asset.total) + sum, 0),
		currency: CURRENCY.KR
	}
}
module.exports = {
	assets,
	setting,
	assetsSummary
}