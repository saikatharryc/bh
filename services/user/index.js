const HttpStatus = require("http-status");

module.exports = async (fastify, opts, next) => {
  /*
   * Get All active sessions
   */
  fastify.route({
    url: "/user/activeSession",
    method: "GET",
    schema: {
      query: {
        type: "object",
        properties: {},
        required: []
      }
    },
    preHandler: [fastify.verifySessionId],
    handler: async (request, reply) => {
      try {
        const sl = await fastify.sessionList(request.session.userid);
        const userActivity = [];
        if (sl instanceof Array) {
          /* eslint no-plusplus: [2, { allowForLoopAfterthoughts: true }] */
          for (let i = 0; i < sl.length; i++) {
            userActivity.push({
              loginTime: sl[i].sessiondata.loginTime,
              ip: sl[i].sessiondata.ipAddress,
              device: sl[i].sessiondata.device,
              ref: sl[i].sessiondata.ref
            });
          }
          reply.send({
            statusCode: HttpStatus.OK,
            error: false,
            message: "Active sessions",
            data: {
              useractivity: userActivity
            }
          });
        }
      } catch (e) {
        reply
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error - Cannot process the request");
      }
    }
  });

  /*
   * Get loggedin user details
   */
  fastify.route({
    url: "/user/details",
    method: "GET",
    schema: {
      query: {
        type: "object",
        properties: {
          id: {
            type: "string"
          }
        },
        required: []
      }
    },
    preHandler: [fastify.verifySessionId],
    handler: async (request, reply) => {
      try {
        // incase id not found in query get self details
        const userId = request.query.id || request.session.userid;
        fastify
          .getUserDetails(userId)
          .then(d => {
            reply.send({
              statusCode: HttpStatus.OK,
              error: false,
              message: "User Details",
              data: d
            });
          })
          .catch(ex => {
            fastify.log.error(ex);
            reply
              .status(HttpStatus.INTERNAL_SERVER_ERROR)
              .send("UNKNOWN ERROR OCCURED");
          });
      } catch (e) {
        reply
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error - Cannot process the request");
      }
    }
  });

  next();
};
