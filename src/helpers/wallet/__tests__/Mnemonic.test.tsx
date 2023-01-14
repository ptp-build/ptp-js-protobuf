import { generateMnemonic, setDefaultWordlist } from 'bip39';

import Mnemonic from '../Mnemonic';
import { MnemonicLangEnum } from '../Wallet';

it('bip39 test', async () => {
  let lang: MnemonicLangEnum = 'english';
  setDefaultWordlist(lang);
  let wordlist = generateMnemonic();
  console.log(wordlist);
  expect(wordlist.split(' ').length).toBe(12);

  lang = 'chinese_simplified';
  setDefaultWordlist(lang);
  wordlist = generateMnemonic();
  console.log(wordlist);
  expect(wordlist.split(' ').length).toBe(12);
});

it('MnemonicHelper test', async () => {
  let mnemonic = new Mnemonic();
  console.log(mnemonic.getWords());
  expect(mnemonic.getWords()!.split(' ').length).toBe(12);
  expect(mnemonic.getLang()).toBe('english');

  mnemonic = new Mnemonic(undefined, 'chinese_simplified');
  console.log(mnemonic.getWords());
  const words = mnemonic.getWords();
  expect(mnemonic.getWords()!.split(' ').length).toBe(12);
  expect(mnemonic.getLang()).toBe('chinese_simplified');

  const seed = mnemonic.toSeedBuffer();
  const seedHex = mnemonic.toSeedHex(undefined);
  const seedWithPassword = mnemonic.toSeedBuffer('12345');

  const entropy = mnemonic.toEntropy();
  console.log('seed', seed);
  console.log('seedWithPassword', seedWithPassword);
  console.log('seedHex', seedHex);
  console.log('seed buffer', Buffer.from(seedHex));
  console.log('entropy', entropy);

  mnemonic = Mnemonic.fromEntropy(entropy);
  expect(mnemonic.getWords()!.split(' ').length).toBe(12);
  expect(mnemonic.getWords()!).toBe(words);
});
