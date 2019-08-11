const crypto = require("crypto");
const find = require("lodash/find");
const HttpStatus = require("http-status");
const createError = require("http-errors");

module.exports = async (fastify, opts, next) => {
  fastify.route({
    url: "/login",
    method: "POST",
    schema: {
      body: {
        type: "object",
        properties: {
          username: {
            type: "string",
            allOf: [{ minLength: 1 }, { maxLength: 50 }]
          },
          password: {
            type: "string",
            allOf: [{ minLength: 1 }, { maxLength: 20 }]
          }
        },
        required: ["username", "password"]
      }
    },
    handler: async (request, reply) => {
      try {
        const doc = await fastify.sql.models.Users.findOne({
          $or: [
            { email: request.body.username },
            { username: request.body.username }
          ]
        });
        let loggedIn = false;
        // console.log(doc,request.body)
        if (doc) {
          // check if the account exists
          const compareRes = await fastify.comparePasswordHash(
            request.body.password,
            doc.password
          );
          if (compareRes === true) {
            loggedIn = true;
          }
        }

        if (loggedIn === true) {
          const ref = crypto.randomBytes(2).toString("hex");
          const sessionId = await fastify.setSessionId({
            userid: doc.email,
            ipAddress: request.ip,
            ref
          });

          reply.status(HttpStatus.OK).send({
            statusCode: HttpStatus.OK,
            message: "New session created",
            errorCode: "NULL",
            data: {
              username: doc.username,
              email: doc.email,
              sessionId,
              ref
            }
          });
        } else {
          reply.status(HttpStatus.FORBIDDEN).send({
            statusCode: HttpStatus.FORBIDDEN,
            message: "Incorrect account credentials",
            errorCode: "INVALID_CREDENTAILS"
          });
        }
      } catch (e) {
        fastify.log.error(e);
        reply
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send("Internal Server Error - Cannot process the request");
      }
    }
  });

  fastify.route({
    url: "/register",
    method: "POST",
    schema: {
      body: {
        type: "object",
        properties: {
          username: {
            type: "string",
            allOf: [{ minLength: 1 }, { maxLength: 15 }]
          },
          email: {
            type: "string",
            format: "email"
          },
          password: {
            type: "string",
            allOf: [{ minLength: 1 }, { maxLength: 20 }]
          }
        },
        required: ["username", "password", "email"]
      }
    },
    handler: async (request, reply) => {
      try {
        const doc = await fastify.sql.models.Users.findOne({
          $or: [
            { email: request.body.email },
            { username: request.body.username }
          ]
        });

        if (doc) {
          // check uf the account exists
          reply.status(HttpStatus.BAD_REQUEST).send({
            statusCode: HttpStatus.BAD_REQUEST,
            message: "Account already exist",
            errorCode: "DUPLICATE_ACCOUNT"
          });
        } else {
          // create new account
          // hash the password
          const passwordHash = await fastify.generatePasswordHash(
            request.body.password
          );
          // persist user account to db
          await fastify.sql.models.Users.create({
            username: request.body.username,
            email: request.body.email,
            password: passwordHash
          });
          // send success response
          reply.status(HttpStatus.OK).send({
            statusCode: HttpStatus.OK,
            message: "New user account created",
            errorCode: "NULL",
            data: {
              username: request.body.username,
              email: request.body.email
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

  fastify.route({
    url: "/logout",
    method: "POST",
    schema: {
      body: {
        type: "object",
        properties: {
          ref: {
            type: "string"
          },
          invalidateAll: {
            type: "boolean"
          },
          self: {
            type: "boolean"
          }
        },
        required: []
      }
    },
    preHandler: [fastify.verifySessionId],
    handler: async (request, reply) => {
      request.body.sessionId = request.session.sessionId;

      try {
        // logout from specific session
        if (request.body.ref !== undefined) {
          // console.log('Target Invalidation')
          const sl = await fastify.sessionList(request.session.userid);
          const fres = find(sl, o => o.sessiondata.ref === request.body.ref);
          if (!fres) {
            throw createError(
              HttpStatus.INTERNAL_SERVER_ERROR,
              "UNKNOWN ERROR OCCURED"
            );
          } else {
            await fastify.removeSessionId(fres.sessionid);
          }
        }

        // logout from all devices
        if (request.body.invalidateAll === true) {
          const sl = await fastify.sessionList(request.session.userid);
          const p = [];
          /* eslint no-plusplus: [2, { allowForLoopAfterthoughts: true }] */
          for (let i = 0; i < sl.length; i++) {
            p.push(fastify.removeSessionId(sl[i].sessionid));
            // console.log('sessionId invalidate', sl[i].sessionid)
          }
          await Promise.all(p);
        }

        // logout from current session
        if (request.body.self === true) {
          await fastify.removeSessionId(request.body.sessionId);
        }

        reply.status(HttpStatus.OK).send({
          statusCode: HttpStatus.OK,
          message: "Session invalidated",
          errorCode: "NULL"
        });
      } catch (e) {
        reply.status(HttpStatus.FORBIDDEN).send({
          statusCode: HttpStatus.FORBIDDEN,
          message: "Unable to logout",
          errorCode: "LOGOUT_FAILED"
        });
      }
    }
  });

  next();
};
