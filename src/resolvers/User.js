function assets(parent, args, context) {
	return context.prisma.user.findOne({
		where: {
			id: parent.id
		}
	}).assets()
}
module.exports = {
	assets
}