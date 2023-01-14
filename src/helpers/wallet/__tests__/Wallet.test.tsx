import Mnemonic from '../Mnemonic';
import Wallet from '../Wallet';

it('Wallet test', async () => {
  const mnemonic = new Mnemonic(
    'lunch pause flip lizard walnut purse airport host alpha tomato mother absent'
  );
  console.log(mnemonic.getWords());
  let wallet = new Wallet(mnemonic);
  console.log(wallet);
  const masterKey = wallet.getMashKey();
  console.log(masterKey);
  const ethWallet = wallet.getEthWallet(0);
  console.log(ethWallet);
  expect(ethWallet.path).toBe("m/44'/60'/0'/0/0");
  let ethWallet1 = wallet.getEthWallet(0, true);
  console.log(ethWallet1);
  expect(ethWallet.path).toBe("m/44'/60'/0'/0/0");
  wallet = new Wallet(mnemonic, '1234234');
  ethWallet1 = wallet.getEthWallet(0, true);
  console.log(ethWallet1);

  wallet = new Wallet(mnemonic, 'wwwww');
  ethWallet1 = wallet.getEthWallet(1, true);
  console.log(ethWallet1);
  expect(ethWallet1.path).toBe("m/44'/60'/0'/0/1");
});
