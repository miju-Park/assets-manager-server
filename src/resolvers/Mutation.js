const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
	APP_SECRET,
	getUserId,
	ASSETS_TYPE,
	CURRENCY,
	getSavingAccountBalance
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
		currency: args.currency ? args.currency : CURRENCY.KR,
		payment: args.payment,
		initialDeposit: args.initialDeposit
	}
	if (args.type === ASSETS_TYPE.CheckingAccount) {
		assetInfo.balance = args.balance;
	} else if (args.type === ASSETS_TYPE.SavingAccount) {
		assetInfo.balance =
			getSavingAccountBalance(args.startdate, args.duedate, args.initialDeposit, args.payment);
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

module.exports = {
	signup,
	login,
	deleteUser,
	createAsset,
	deleteAsset,
	updateAsset
}