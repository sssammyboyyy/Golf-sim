module.exports = {
  ci: {
    collect: {
      // Best Practice: Audit the actual production build users see
      startServerCommand: 'npm run build && npm start', 
      chromePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      url: ['http://localhost:3000/admin', 'http://localhost:3000/booking'],
      numberOfRuns: 3, 
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        // Prevent mobile zoom-breaking fonts
        'font-size': 'error',
        // Ensure buttons are big enough for mobile thumbs
        'tap-targets': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
