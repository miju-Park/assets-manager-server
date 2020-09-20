function assets(parent, args, context, info) {
	return context.prisma.assets.findMany();
}
module.exports = {
	assets
}