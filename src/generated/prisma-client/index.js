"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_lib_1 = require("prisma-client-lib");
var typeDefs = require("./prisma-schema").typeDefs;

var models = [
  {
    name: "User",
    embedded: false
  },
  {
    name: "Assets",
    embedded: false
  },
  {
    name: "Currency",
    embedded: false
  },
  {
    name: "CheckingAccount",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `https://us1.prisma.sh/gi6238/assets-manager/dev`
});
exports.prisma = new exports.Prisma();
