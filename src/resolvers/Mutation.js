const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {
	APP_SECRET,
	getUserId
} = require('../utils')



async function signup(parent, args, context, info) {
	const password = await bcrypt.hash(args.password, 10)
	const user = await context.prisma.user.create({
		data: {
			...args,
			password,
			assets: {
				create: {
					checkingAccount: []
				}
			}
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

	console.log(user)
	return !!user;
}
module.exports = {
	signup,
	login,
	deleteUser
}