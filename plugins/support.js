const fp = require("fastify-plugin");

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp((fastify, opts, next) => {
  // TODO: Send by populatng basic details of OrganizationId
  fastify.decorate("getUserDetails", userId =>
    fastify.sql.models.Users.findById(userId, {
      exclude: ["password", "RoleId"]
    })
  );
  next();
});
