const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
	APP_SECRET,
	getUserId,
	ASSETS_TYPE,
	CURRENCY,
	getSavingAccountBalance,
	getCurrentUSStockPrice,
	getUSDStockBalance,
	renewSettingInfo
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
		bank: args.bank,
		title: args.title,
		startdate: args.startdate,
		duedate: args.duedate,
	}
	if (args.type === ASSETS_TYPE.CheckingAccount) {
		assetInfo = {
			...assetInfo,
			currency: args.currency ? args.currency : CURRENCY.KR,
			balance: args.balance
		}

	} else if (args.type === ASSETS_TYPE.SavingAccount) {
		assetInfo = {
			...assetInfo,
			currency: args.currency ? args.currency : CURRENCY.KR,
			payment: args.payment,
			initialDeposit: args.initialDeposit,
			balance: getSavingAccountBalance(args.startdate, args.duedate, args.initialDeposit, args.payment)
		}
	} else if (args.type === ASSETS_TYPE.USDStock) {
		const price = await getCurrentUSStockPrice(args.ticker)
		assetInfo = {
			...assetInfo,
			currency: CURRENCY.USD,
			count: args.count,
			ticker: args.ticker,
			currentPrice: price,
			averagePrice: args.averagePrice,
			balance: getUSDStockBalance(price, args.count)
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
	} else if (updateBody.type === ASSETS_TYPE.USDStock) {
		updateBody.balance = await getUSDStockBalance(updateBody.currentPrice, updateBody.count);
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
	const USDStocks = myAssets.filter(asset => asset.type === ASSETS_TYPE.USDStock);
	for (const stock of USDStocks) {
		const currentPrice = await getCurrentUSStockPrice(stock.ticker);
		const balance = await getUSDStockBalance(currentPrice, stock.count);
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