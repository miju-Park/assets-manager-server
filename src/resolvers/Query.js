const {
	getUserId,
	CURRENCY,
} = require("../utils");

async function assets(parent, args, context, info) {
	const userId = getUserId(context);
	const filter = args.filter ? {
		ownerId: userId,
		type: args.filter
	} : {
		ownerId: userId
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
module.exports = {
	assets,
	setting
}