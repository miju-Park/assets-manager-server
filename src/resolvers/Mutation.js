const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
	APP_SECRET,
	getUserId,
	ASSETS_TYPE,
	CURRENCY,
	getSavingAccountBalance,
	getCurrentUSStockPrice,
	getStockBalance,
	renewSettingInfo,
	getCurrentKRStockPrice,
	isStock
} = require('../utils')

async function signup(parent, args, context, info) {
	const password = await bcrypt.hash(args.password, 10)
	const user = await context.prisma.user.create({
		data: {
			...args,
			password,
		}
	})
	const token = jwt.sign({
		userId: user.id
	}, APP_SECRET)


	return {
		token,
		user
	}
}
async function login(parent, args, context, info) {
	const user = await context.prisma.user.findOne({
		where: {
			email: args.email
		}
	})
	if (!user) {
		throw new Error('No Such user found');
	}

	const valid = await bcrypt.compare(args.password, user.password);
	if (!valid) {
		throw new Error('Invalid password');
	}
	const token = jwt.sign({
		userId: user.id
	}, APP_SECRET);
	return {
		token,
		user
	}
}

async function deleteUser(parent, args, context) {
	const user = await context.prisma.user.delete({
		where: {
			id: args.id
		},
	});
	await context.prisma.assets.deleteMany({
		where: {
			ownerId: null
		}
	})
	return !!user;
}

async function createAsset(parent, args, context) {
	const userId = getUserId(context);
	let assetInfo = {
		type: args.type,
		title: args.title,
		currency: args.currency ? args.currency : CURRENCY.KR,
	}
	if (args.type === ASSETS_TYPE.CheckingAccount) {
		assetInfo = {
			...assetInfo,
			bank: args.bank,
			startdate: args.startdate,
			duedate: args.duedate,
			currency: args.currency ? args.currency : CURRENCY.KR,
			balance: args.balance
		}

	} else if (args.type === ASSETS_TYPE.SavingAccount) {
		assetInfo = {
			...assetInfo,
			bank: args.bank,
			startdate: args.startdate,
			duedate: args.duedate,
			currency: args.currency ? args.currency : CURRENCY.KR,
			payment: args.payment,
			initialDeposit: args.initialDeposit,
			balance: getSavingAccountBalance(args.startdate, args.duedate, args.initialDeposit, args.payment)
		}
	} else if (args.type === ASSETS_TYPE.USDStock) {
		const price = await getCurrentUSStockPrice(args.ticker);
		const settings = await context.prisma.setting.findMany()
		const exchangeRate = settings[0].exchangeRate;
		assetInfo = {
			...assetInfo,
			currency: CURRENCY.USD,
			count: args.count,
			ticker: args.ticker,
			currentPrice: price,
			averagePrice: args.averagePrice,
			balance: await getStockBalance(CURRENCY.USD, price, args.count, exchangeRate)
		}
	} else if (args.type === ASSETS_TYPE.KRStock ||
		args.type === ASSETS_TYPE.IRP ||
		args.type === ASSETS_TYPE.PersonalPension) {
		const price = await getCurrentKRStockPrice(args.ticker)
		assetInfo = {
			...assetInfo,
			currency: CURRENCY.KR,
			count: args.count,
			ticker: args.ticker,
			currentPrice: price,
			averagePrice: args.averagePrice,
			balance: await getStockBalance(CURRENCY.KR, price, args.count, 1)
		}
	} else if (args.type === ASSETS_TYPE.RealAssets) {
		assetInfo = {
			...assetInfo,
			startdate: args.startdate,
			duedate: args.duedate,
			currency: CURRENCY.KR,
			balance: args.balance
		}
	} else if (args.type === ASSETS_TYPE.CMA) {
		assetInfo = {
			...assetInfo,
			bank: args.bank,

			balance: args.balance
		}
	}
	const assets = await context.prisma.assets.create({
		data: {
			...assetInfo,
			owner: {
				connect: {
					id: userId
				}
			}
		}
	})
	return assets;
}
async function deleteAsset(parent, args, context) {
	const data = await context.prisma.assets.delete({
		where: {
			id: args.id
		}
	})
	return !!data;
}

async function updateAsset(parent, args, context) {
	const target = await context.prisma.assets.findOne({
		where: {
			id: args.id
		}
	})
	let updateBody = {
		...target,
		...args
	}
	delete updateBody.id;
	delete updateBody.owner;
	delete updateBody.ownerId;
	if (updateBody.type === ASSETS_TYPE.SavingAccount) {
		updateBody.balance =
			getSavingAccountBalance(updateBody.startdate,
				updateBody.duedate, updateBody.initialDeposit,
				updateBody.payment);
	} else if (isStock(updateBody.type)) {
		const settings = await context.prisma.setting.findMany()
		const exchangeRate = settings[0].exchangeRate;
		updateBody.balance = await getStockBalance(updateBody.currency,
			updateBody.currentPrice, updateBody.count, exchangeRate);
	}
	const assets = await context.prisma.assets.update({
		where: {
			id: args.id
		},
		data: {
			...updateBody
		}
	})
	return assets;
}
async function renewAssetInfo(parent, args, context) {
	const userId = getUserId(context);
	const myAssets = await context.prisma.assets.findMany({
		where: {
			ownerId: userId
		}
	});
	const stocks = myAssets.filter(asset => isStock(asset.type));
	const settings = await context.prisma.setting.findMany()
	const exchangeRate = settings[0].exchangeRate;
	await updateSetting(parent, {
		id: settings[0].id
	}, context);
	for (const stock of stocks) {
		const currentPrice = stock.currency === CURRENCY.USD ?
			await getCurrentUSStockPrice(stock.ticker) :
			await getCurrentKRStockPrice(stock.ticker)
		const balance = await getStockBalance(stock.currency, currentPrice, stock.count, exchangeRate);
		await context.prisma.assets.update({
			where: {
				id: stock.id
			},
			data: {
				currentPrice,
				balance
			}
		})
	}
	return true;
}
async function updateSetting(parent, args, context) {
	const mysetting = await context.prisma.setting.findOne({
		where: {
			id: args.id
		}
	});
	const info = await renewSettingInfo(mysetting);
	if (info) {
		return await context.prisma.setting.upsert({
			where: {
				id: args.id
			},
			update: {
				id: args.id,
				...info
			},
			create: {
				id: args.id,
				...info
			}
		})
	}
	return mysetting;
}


module.exports = {
	signup,
	login,
	deleteUser,
	createAsset,
	deleteAsset,
	updateAsset,
	renewAssetInfo,
	updateSetting
}