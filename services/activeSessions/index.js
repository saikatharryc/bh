const HttpStatus = require("http-status");

module.exports = async (fastify, opts, next) => {
  /*
   * Get All active sessions
   */
  fastify.route({
    url: "/activeSession",
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

  next();
};
