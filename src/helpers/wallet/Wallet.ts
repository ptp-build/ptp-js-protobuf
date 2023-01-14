import { hdkey as HDKey } from 'ethereumjs-wallet';

import Mnemonic from './Mnemonic';

export type MnemonicLangEnum = 'english' | 'chinese_simplified';

export const EthBip44RootKeyPrefixPath = "m/44'/60'/0'";

export default class Wallet {
  private __masterKey: any | undefined;

  constructor(mnemonic: Mnemonic, password?: string | undefined) {
    const seed = mnemonic.toSeedBuffer(password);
    this.__masterKey = HDKey.fromMasterSeed(seed);
    Object.defineProperty(this, '__masterKey', {
      value: HDKey.fromMasterSeed(seed),
      writable: false,
    });
  }

  getMashKey() {
    return this.__masterKey!;
  }

  static fromEntropy(
    entropy: string,
    password: string | undefined,
    lang: MnemonicLangEnum | undefined
  ) {
    const mnemonic = Mnemonic.fromEntropy(entropy, lang);
    return new Wallet(mnemonic, password);
  }

  getChild(
    root: string,
    childIndex = 0,
    changeIndex: number = 0,
    hex: boolean = false
  ) {
    const path = `${root}/${changeIndex}/${childIndex}`;
    const childKey = this.getMashKey().derivePath(path);
    const address = childKey.getWallet().getAddressString();
    const prvKey = childKey._hdkey.privateKey;
    const pubKey = childKey._hdkey.publicKey;
    const pubKey_ = childKey.getWallet().getPublicKey();
    if (hex) {
      return {
        path,
        address,
        prvKey: Wallet.bufferToHex(prvKey),
        pubKey: Wallet.bufferToHex(pubKey),
        pubKey_: Wallet.bufferToHex(pubKey_),
      };
    } else {
      return {
        path,
        address,
        prvKey,
        pubKey,
        pubKey_,
      };
    }
  }

  static bufferToHex(buffer: Buffer) {
    return '0x' + buffer.toString('hex');
  }

  getEthWallet(childIndex: number, hex?: boolean) {
    return this.getChild(EthBip44RootKeyPrefixPath, childIndex, 0, !!hex);
  }
}
