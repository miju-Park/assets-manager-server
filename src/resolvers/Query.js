async function users(parent, args, context) {
	return context.prisma.users();
}

module.exports = {
	users
};
