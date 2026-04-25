module.exports = {
  apps: [
    {
      name: "content-worker",
      script: "node",
      args: "dist/jobs/runContentJob.js",
      cwd: ".",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 1000,
      exp_backoff_restart_delay: 100,
      env: {
        CONTINUOUS_MODE: "true"
      }
    }
  ]
};
