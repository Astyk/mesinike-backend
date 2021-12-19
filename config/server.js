module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'f89e8def5e4a0eff9f988d33f341a632'),
    },
  },
  cron: {
    enabled: true,
  }
});
