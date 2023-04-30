export function render_Msg(name: string, fileNamespace: string[],isBaseFile?: boolean,typesName?:string,hideCmd?:boolean) {
  let h = ""
  let tt = "";
  // if(!isBaseFile && name.substring(name.length -3) !== 'Res'){
  //   const sid = fileNamespace[1]
  //
  // }
  h = ``
  tt = ``
  let ttt = "";
  let tttt = "";

  tt = hideCmd ? "": `import { ActionCommands } from '../ActionCommands';
`
  h = hideCmd ? "" : `
    this.setCommandId(ActionCommands.CID_${name});`;

  tttt = "default "
  ttt = `import type { Pdu } from '../BaseMsg';
import type { ${name}_Type } from './${!typesName ? "types":typesName}';\n\n`



  return `${tt}${ttt}export ${tttt}class ${name} extends BaseMsg {
  public msg?: ${name}_Type
  constructor(msg?: ${name}_Type) {
    super('${fileNamespace.join(".")}.${name}', msg);${h}
    this.msg = msg;
  }
  static parseMsg(pdu : Pdu): ${name}_Type {
    return new ${name}().decode(pdu.body());
  }
}
`
}

export function render_Msg_parser(name: string,fileName:string) {
  return `import type { ParseOptions } from '../../helpers';
import type { ${name}_Type } from '../../${fileName}';
import { ${name} } from '../../${fileName}';

export default class ${name}Parser extends ${name} {
  parse(data: Uint8Array, options?: ParseOptions) {
    const obj: ${name}_Type = this.decode(data);
    return obj;
  }
}
`
}

export const render_Interfaces = (name:string, fields: any) => {
  const lines:string[] = []
  fields.forEach((field:any)=>{
    if(field.fieldType === 'double'){
      field.fieldType = "number"
    }
    lines.push(`${field.name}${field.isRequired ? "":"?"}: ${field.fieldType}`)
  })
  const t = lines.length > 0 ? `\n  ${lines.join(";\n  ")};\n` : ""
  return `export interface ${name}_Type {${t}}
`
}

export const render_enums = (item: any) => {
  const lines:string[] = []
  Object.keys(item.values).forEach((name: string)=>{
    lines.push(`${name} = ${item.values[name]}`)
  })
  return `export enum ${item.name} {
  ${lines.join(",\n  ")},
}

`
}

export const render_import = (fileName: string) => {
  return `import type * as ${fileName} from './${fileName}'`
}

export const render_BaseMsg = () => {
  return `const PB = require('./protobuf');

import type {
  ActionCommands
} from './ActionCommands';

let bbStack: BytesType[] = [];

export interface BytesType {
  bytes: Uint8Array;
  offset: number;
  limit: number;
}

export function popByteBuffer() {
  const bb = bbStack.pop();
  if (!bb) return { bytes: new Uint8Array(64), offset: 0, limit: 0 };
  bb.offset = bb.limit = 0;
  return bb;
}

export function toUint8Array(bb: BytesType) {
  let bytes = bb.bytes;
  let limit = bb.limit;
  return bytes.length === limit ? bytes : bytes.subarray(0, limit);
}

export function grow(bb: BytesType, count: number) {
  let bytes = bb.bytes;
  let offset = bb.offset;
  let limit = bb.limit;
  let finalOffset = offset + count;
  if (finalOffset > bytes.length) {
    let newBytes = new Uint8Array(finalOffset * 2);
    newBytes.set(bytes);
    bb.bytes = newBytes;
  }
  bb.offset = finalOffset;
  if (finalOffset > limit) {
    bb.limit = finalOffset;
  }
  return offset;
}

export function advance(bb: BytesType, count: number) {
  let offset = bb.offset;
  if (offset + count > bb.limit) {
    throw new Error('Read past limit');
  }
  bb.offset += count;
  return offset;
}

export function readInt32(bb: BytesType) {
  let offset = advance(bb, 4);
  let bytes = bb.bytes;
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

export function writeInt32(bb: BytesType, value: number) {
  let offset = grow(bb, 4);
  let bytes = bb.bytes;
  bytes[offset + 3] = value;
  bytes[offset + 2] = value >> 8;
  bytes[offset + 1] = value >> 16;
  bytes[offset] = value >> 24;
}

export function readInt16(bb: BytesType) {
  let offset = advance(bb, 2);
  let bytes = bb.bytes;

  return (bytes[offset] << 8) | bytes[offset + 1];
}

export function writeInt16(bb: BytesType, value: number) {
  let offset = grow(bb, 2);
  let bytes = bb.bytes;
  bytes[offset + 1] = value;
  bytes[offset] = value >> 8;
}

export function readBytes(bb: BytesType, count: number) {
  let offset = advance(bb, count);
  return bb.bytes.subarray(offset, offset + count);
}

export function writeBytes(bb: BytesType, buffer: Buffer) {
  let offset = grow(bb, buffer.length);
  bb.bytes.set(buffer, offset);
}

export function wrapByteBuffer(bytes: Uint8Array) {
  return { bytes, offset: 0, limit: bytes.length };
}

export const HEADER_LEN: number = 16;

export interface Header {
  length: number;
  version: number;
  flag: number;
  command_id: number;
  seq_num: number;
  reversed: number;
}

export class Pdu {
  private _pbData: Uint8Array;
  private _pbHeader: Header;
  private _pbBody: Uint8Array;
  private _bb: BytesType;

  constructor(data?: Uint8Array) {
    this._pbData = new Uint8Array();
    this._pbBody = new Uint8Array();
    this._bb = popByteBuffer();
    this._pbHeader = {
      length: 0,
      version: 0,
      flag: 0,
      command_id: 0,
      seq_num: 0,
      reversed: 0,
    };
    if (data) {
      this.setPbData(data);
      this.readPbData();
    }
  }

  getPbData(): Uint8Array {
    return this._pbData;
  }

  setPbData(data: Uint8Array) {
    this._pbData = data;
  }

  getPbDataLength(): number {
    return this._pbData.length;
  }

  getPbBody(): Uint8Array {
    return this._pbBody;
  }
  
  body(): Uint8Array {
    return this._pbBody;
  }

  getPbBodyLength(): number {
    return this._pbBody.length;
  }

  setPbBody(body: Uint8Array) {
    this._pbBody = body;
  }

  writeData(
    body: Uint8Array,
    command_id: ActionCommands,
    seq_num: number = 0,
    reversed: number = 0
  ) {
    this.setPbBody(body);

    this._pbHeader = {
      length: body.length + HEADER_LEN,
      version: 0,
      flag: 0,
      command_id,
      seq_num: seq_num,
      reversed,
    };
    writeInt32(this._bb, this._pbHeader.length);
    writeInt16(this._bb, this._pbHeader.version);
    writeInt16(this._bb, this._pbHeader.flag);
    writeInt16(this._bb, this._pbHeader.command_id);
    writeInt16(this._bb, this._pbHeader.seq_num);
    writeInt32(this._bb, this._pbHeader.reversed);
    writeBytes(this._bb, Buffer.from(body));
    this.setPbData(toUint8Array(this._bb));
  }

  public updateSeqNo(seq_num:number){
    this._bb = wrapByteBuffer(this._pbData)
    this._bb.offset = 10;
    writeInt16(this._bb, seq_num);
    this._pbHeader.seq_num = seq_num;
    this.setPbData(toUint8Array(this._bb));
  }
  readPbData() {
    const headerBb = wrapByteBuffer(this._pbData.slice(0, HEADER_LEN));
    this._pbHeader.length = readInt32(headerBb);
    this._pbHeader.version = readInt16(headerBb);
    this._pbHeader.flag = readInt16(headerBb);
    this._pbHeader.command_id = readInt16(headerBb);
    this._pbHeader.seq_num = readInt16(headerBb);
    this._pbHeader.reversed = readInt32(headerBb);
    this.setPbBody(this._pbData.slice(HEADER_LEN, this._pbHeader.length));
  }

  getCommandId(): ActionCommands {
    return this._pbHeader.command_id;
  }

  getReversed(): number {
    return this._pbHeader.reversed;
  }
  getSeqNum(): number {
    return this._pbHeader.seq_num;
  }
}

let seq_num = 0;

export default class BaseMsg {
  private __cid?: any;
  public msg?: any;
  private __pb: any;
  constructor(namespace: string, msg?: any) {
    const t = namespace.split('.');
    let pb = PB.default;
    do {
      const k = t.shift();
      // @ts-ignore
      pb = pb[k];
    } while (t.length > 0);
    this.__pb = pb;
    this.setMsg(msg);
  }
  protected setCommandId(cid: any) {
    this.__cid = cid;
  }
  setMsg(msg: any) {
    this.msg = msg;
  }
  getMsg() {
    return this.msg;
  }
  encode(): Uint8Array {
    return this.__E();
  }
  decode(data: Uint8Array) {
    return this.__D(data);
  }
  pack(): Pdu {
    return this.__pack();
  }
  toHex(): string {
    return Buffer.from(this.__E()).toString('hex');
  }
  fromHex(hexStr: string): any {
    if (hexStr.indexOf('0x') === 0) {
      hexStr = hexStr.substring(2);
    }
    return this.__D(Buffer.from(hexStr, 'hex'));
  }
  protected __E(): Uint8Array {
    const obj = this.__pb.create(this.getMsg());
    return this.__pb.encode(obj).finish();
  }
  protected __D(data: Uint8Array): any {
    const obj = this.__pb.decode(data);
    return this.__pb.toObject(obj);
  }
  protected __pack(): Pdu {
    const pdu = new Pdu();
    if (seq_num > 10000) {
      seq_num = 0;
    }
    pdu.writeData(this.__E(), this.__cid, ++seq_num);
    return pdu;
  }
}

`;
}

export const render_test_subMsg = (msgName:string,isRepeated:boolean,fieldsLines:string[] ) => {
  const code = `new ${msgName}({
          ${fieldsLines.join(',\n          ')},
        }).getMsg()`
  return isRepeated ? `[${code}]` : code;
}

export const render_test = (msgName:string, fileName: string, dataFieldsLines: string[], expectLines: string[]) => {
  let t = "";
  if(dataFieldsLines.length > 0){
    t = `const enMsg = new ${msgName}({
      ${dataFieldsLines.join('\n      ')}
    }).encode();`
  }else{
    t = `const enMsg = new ${msgName}({}).encode();`
  }
  return `describe('${fileName}', () => {
  it('${msgName} test', async () => {
    ${t}
    const deMsg = new ${msgName}().decode(enMsg);
    console.log({ enMsg, deMsg });
    expect(1).toEqual(1);
  });
});
`
}

export const render_test_msg_server = (msgName:string, fileName: string,dataFieldsLines: string[],msgFiles:any) => {
  let bottom = '';
  if("Req" === msgName.substring(msgName.length-3)){
    const res = msgFiles[fileName].msgs.find((obj:any)=>obj.name === msgName.replace("Req","Res"))
    if(res){
      const resName = msgName.replace("Req","Res");
      bottom += '\n';
      bottom += `    const msg = ${resName}.handlePdu(pdu);\n    console.log(msg);`
    }
  }else{
    bottom += '\n';
    bottom += `    const msg = ${msgName}.handlePdu(pdu);\n    console.log(msg);`
  }
  return `
describe('${fileName} client test', () => {
  it('${msgName} test', async () => {
    const client = new MsgConnTest(config.AuthKey);
    client.setAutoReconnect(false);
    client.connect();
    await client.waitForMsgServerState(MsgConnTestState.connected);
    await client.login();
    const pdu = await client.SendPduWithCallback(
      new ${msgName}({
        ${dataFieldsLines.join('\n        ')}
      }).pack()
    );
    console.log(pdu);${bottom}
    await client.logout();
    await client.waitForMsgServerState(MsgConnTestState.closed);
    expect(1).toEqual(1);
  });
});
`

}

export const render_msg_handler = (msgFiles:any) => {
  const cidList: Record<string, string[]> = {}
  let import1s= ""
  let handlerMap = "";

  Object.keys(msgFiles).forEach(fileName=>{
    if(fileName !== 'PTPCommon'){
      const mm:string[] = []
      msgFiles[fileName].msgs.forEach((msg:any)=>{
        const t = msg.name.substring(msg.name.length - 3)
        if(t ==="Res" || msg.name.indexOf("Notify") > 0){
          mm.push(msg.name)
          handlerMap += `[ActionCommands.CID_${msg.name}] : ${msg.name},\n  `
        }
      })
      const n = msgFiles[fileName]["fileNamespace"][1]

      cidList[n] = mm;
      import1s += `import {\n`;
      msgFiles[fileName].msgs.forEach((msg:any)=>{
        const t = msg.name.substring(msg.name.length - 3)
        if(t ==="Res" || msg.name.indexOf("Notify") > 0){
          import1s += `  ${msg.name},\n`
        }
      })
      import1s += `} from './${fileName}';\n`;
    }
  })
  return `import type { Pdu } from './BaseMsg';
import { ActionCommands,getActionCommandsName } from './ActionCommands'
${import1s}

const handlerMap:Record<number, any> = {
  ${handlerMap}
}
export class MsgHandler {
  static handlePdu(pdu: Pdu, accountId : number): any {
    const cid = getActionCommandsName(pdu.getCommandId());
    console.log(\`parse: \${cid} => \${cid},aId:\${accountId}\`);
    if(handlerMap[pdu.getCommandId()]){
      return handlerMap[pdu.getCommandId()].parseMsg(pdu);
    }else{
      return null;
    }
  }
}
`
}
