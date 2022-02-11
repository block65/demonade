let i = 0;
setInterval(() => console.log(i++), 1000);

process.once('exit', () => {
  console.log('ded');
});

process.once('SIGUSR1', () => {
  console.log('SIGUSR1, send SIGINT');
  process.kill(process.pid, 'SIGINT');
});
