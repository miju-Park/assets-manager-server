function owner(parent, args, context) {
  return context.prisma.assets.findOne({
    where: {
      id: parent.id
    }
  }).owner()
}


module.exports = {
  owner
}