const path = require('path');
const AutoLoad = require('fastify-autoload');
const fastifySwagger = require('fastify-swagger');

module.exports = (fastify, opts, next) => {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...opts },
  });

  // This loads all plugins defined in services
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'services'),
    options: { ...opts },
  });

  fastify.register(fastifySwagger, {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'BH',
        description: 'Swagger docs',
        version: '0.1.0',
      },
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'x-session-id',
          in: 'header',
        },
      },
    },
    exposeRoute: process.env.NODE_ENV === 'development', // dont expose if its not development
  });
  // This loads all plugins defined in services
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'services'),
    options: { ...opts },
  });
  // Make sure to call next when done
  next();
};
