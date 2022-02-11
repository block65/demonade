let i = 0;
setInterval(() => console.log(i++), 1000);

process.on("exit", () => {
  console.log("ded");
});
