const { ethers } = require("ethers");
const fs = require("fs");
const readline = require("readline");
const ora = require("ora");
const chalk = require("chalk");
const cliProgress = require("cli-progress");

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const pk = fs.readFileSync("pk.txt", "utf8").trim();
const provider = new ethers.JsonRpcProvider(config.rpc);
const wallet = new ethers.Wallet(pk, provider);

const erc20Abi = [
  "function transfer(address to, uint amount) external returns (bool)",
  "function decimals() view returns (uint8)",
];

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  try {
    console.log(chalk.blue.bold("\n🚀 Bulking Transfer Token ERC-20"));

    const input = await ask(
      "🔢 Masukkan jumlah address random yang akan menerima token: "
    );
    const totalTransfers = parseInt(input.trim());

    if (isNaN(totalTransfers) || totalTransfers <= 0) {
      return console.log(chalk.red("❌ Jumlah tidak valid. Harus angka lebih dari 0."));
    }

    const token = new ethers.Contract(config.tokenAddress, erc20Abi, wallet);
    const decimals = await token.decimals();
    const amount = ethers.parseUnits("5", decimals);

    const outputFile = "generated.txt";
    fs.writeFileSync(outputFile, "");

    const bar = new cliProgress.SingleBar({
      format: "Progress |{bar}| {percentage}% || {value}/{total} Items",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    }, cliProgress.Presets.shades_classic);

    bar.start(totalTransfers, 0);

    for (let i = 0; i < totalTransfers; i++) {
      const newWallet = ethers.Wallet.createRandom();
      const address = newWallet.address;

      fs.appendFileSync(outputFile, `${address}\n`);

      const spinner = ora(`🚚 Transfer ke ${address}`).start();

      const startTime = Date.now();

      const tx = await token.transfer(address, amount);
      spinner.text = `⏳ Menunggu konfirmasi TX...`;

      await tx.wait();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const adjustedSpeed = Math.max(2000 - duration, 100);

      bar.update(i + 1);

      spinner.succeed(`✅ Transfer sukses ke ${address}`);
      console.log(chalk.green(`🔗 TX Hash: ${tx.hash}\n`));

      await sleep(adjustedSpeed);
    }

    bar.stop();
    console.log(chalk.cyan.bold(`📄 Semua address disimpan di file '${outputFile}'`));
    console.log(chalk.green.bold("✅ Semua transfer selesai!\n"));
  } catch (err) {
    console.error(chalk.red("❌ Error:"), err.message);
  }
})();
