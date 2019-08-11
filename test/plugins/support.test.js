const { test } = require('tap');
const Fastify = require('fastify');
const Auth = require('../../plugins/auth');

test('auth generatePasswordHash', async (t) => {
  t.plan(1);
  const fastify = Fastify();
  fastify.register(Auth);
  await fastify.ready();
  const passWord = 'sa23232';
  const resultHash = await fastify.generatePasswordHash(passWord);
  t.equal(await fastify.comparePasswordHash(passWord, resultHash), true);
});
