module.exports = {
  ci: {
    collect: {
      // Direct npx calls avoid some shell issues on Windows
      startServerCommand: 'npx next build && npx next start', 
      url: ['http://localhost:3000/', 'http://localhost:3000/booking'],
      numberOfRuns: 1, // Start with 1 to see result faster
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'font-size': 'error',
        'tap-targets': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
