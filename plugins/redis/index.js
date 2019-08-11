const fp = require("fastify-plugin");
const fastifyRedis = require("fastify-redis");

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(
  async (fastify, opts, next) => {
    /*
        import and register redis client library.
        attempt to establish the connection with redis db.
        redis instance will be available globally as fastify.redis exposed using decorator.
    */
    fastify
      .register(fastifyRedis, {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASS
      })
      .after(err => {
        if (err) {
          fastify.log.error("Unable to register redis pluglin");
        } else {
          const { redis } = fastify;

          // register error event handler
          redis.on("error", error => {
            fastify.log.error(
              "Unable to establish connection with redis server",
              error.message
            );
          });

          // register reconnecting event handler
          redis.on("reconnecting", () => {
            fastify.log.info("Attempting to reconnect with redis");
          });

          // register connect event handler
          redis.on("connect", () => {
            fastify.log.info(
              "Connection with redis established.",
              "Host :",
              redis.options.host,
              "Port :",
              redis.options.port
            );
          });
        }
      });

    next();
  },
  {
    name: "redis-conn"
  }
);
