/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://nandscape.dev',
  generateRobotsTxt: true,
  transform: async (config, path) => {
    if (path.startsWith('/tutorials')) {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      };
    }

    if (path.startsWith('/blog')) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      };
    }

    if (path.startsWith('/puzzles')) {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      };
    }

    return {
      loc: path,
      changefreq: 'monthly',
      priority: 0.5,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};