const {
	getUserId
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
		currency: assets[0].currency
	}
}
module.exports = {
	assets
}