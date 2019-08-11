const fp = require('fastify-plugin');
const bcrypt = require('bcrypt');
const uuid4 = require('uuid/v4');
const moment = require('moment');
const HttpStatus = require('http-status');
const createError = require('http-errors');

module.exports = fp((fastify, opts, next) => {
  // define and export generatePasswordHash decorator
  fastify.decorate(
    'generatePasswordHash',
    (inputString) => new Promise((resolve, reject) => {
      bcrypt
        .hash(inputString, 8)
        .then((res) => {
          resolve(res);
        })
        .catch((e) => {
          reject(e);
        });
    }),
  );

  // define and export comparePasswordHash decorator
  fastify.decorate(
    'comparePasswordHash',
    (password, inputString) => new Promise((resolve, reject) => {
      if (inputString === null) {
        inputString = '';
      }
      bcrypt
        .compare(password, inputString)
        .then((res) => {
          resolve(res);
        })
        .catch((e) => {
          reject(e);
        });
    }),
  );

  fastify.decorate('verifySessionId', (request, reply, done) => {
    const sessionId = request.headers['x-session-id'];

    if (sessionId === undefined || sessionId === null) {
      reply.status(HttpStatus.BAD_REQUEST).send({
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: 'NO_SESSIONID',
        message: 'Request does not contain x-session-id header',
      });
    } else {
      fastify
        .getSessionId(sessionId)
        .then((r) => {
          request.session = r;
          r.sessionId = sessionId;
          return done();
        })
        .catch((e) => {
          fastify.log.error(e);
          reply.status(HttpStatus.BAD_REQUEST).send({
            statusCode: HttpStatus.BAD_REQUEST,
            errorCode: 'INVALID_SESSIONID',
            message: 'Invalid x-session-id',
          });
        });
    }
  });

  // get session key from redis
  fastify.decorate(
    'getSessionId',
    (sessionId) => new Promise((resolve, reject) => {
      fastify.redis.get(sessionId, (err, result) => {
        if (result === null || err !== null) {
          reject(createError(HttpStatus.BAD_REQUEST, 'Session ID not found'));
        } else {
          resolve(JSON.parse(result));
        }
      });
    }),
  );

  // add session key/val in redis
  fastify.decorate(
    'setSessionId',
    (value) => new Promise((resolve, reject) => {
      const sessionId = uuid4();
      value.loginTime = moment.utc().format();
      fastify.redis.set(sessionId, JSON.stringify(value), (err, result) => {
        if (result === null) {
          reject(
            createError(HttpStatus.BAD_REQUEST, 'Session ID not stored'),
          );
        }
        fastify.redis.expire(sessionId, process.env.SESSION_TTL_SECS);
        fastify.redis.smembers(value.userid, () => {
          fastify.redis.sadd(value.userid, sessionId, (errA) => {
            if (errA) {
              reject(createError(HttpStatus.BAD_REQUEST, 'Unknown Error'));
            }
            resolve(sessionId);
          });
        });
      });
    }),
  );

  // remove session key from redis
  fastify.decorate(
    'removeSessionId',
    (sessionId) => new Promise((resolve, reject) => {
      fastify.redis.get(sessionId, (err, resultG) => {
        if (resultG === null) {
          reject(createError(HttpStatus.BAD_REQUEST, 'Session ID not found'));
        } else {
          const getResult = JSON.parse(resultG);
          fastify.redis.del(sessionId, (errD, result) => {
            if (result === null && getResult !== null) {
              reject(
                createError(HttpStatus.BAD_REQUEST, 'Session ID not removed'),
              );
            }
            fastify.redis.smembers(getResult.userid, () => {
              fastify.redis.srem(getResult.userid, sessionId, () => {
                resolve(result);
              });
            });
          });
        }
      });
    }),
  );

  // get user activity data
  fastify.decorate(
    'sessionList',
    (userId) => new Promise((resolve, reject) => {
      try {
        const sessionActivity = [];
        fastify.redis.smembers(userId, (err, result) => {
          if (result instanceof Array === true && result.length > 0) {
            /* eslint no-plusplus: [2, { allowForLoopAfterthoughts: true }] */
            for (let i = 0; i < result.length; i++) {
              fastify.redis.get(result[i], (errL, data) => {
                // console.log(result[i], data)
                if (data === null) {
                  fastify.redis.srem(userId, result[i]);
                } else {
                  sessionActivity.push({
                    sessionid: result[i],
                    sessiondata: JSON.parse(data),
                  });
                }
                if (i === result.length - 1) {
                  resolve(sessionActivity);
                }
              });
            }
          } else {
            resolve([]);
          }
        });
      } catch (ex) {
        reject(ex);
      }
    }),
  );

  next();
});
