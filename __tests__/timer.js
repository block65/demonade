let i = 0;
setInterval(() => console.log((i += 4)), 1000);

process.once('exit', () => {
  console.log('ded');
});

process.once('SIGUSR1', () => {
  console.log('Got SIGUSR1, send a SIGINT');
  process.kill(process.pid, 'SIGINT');
});
