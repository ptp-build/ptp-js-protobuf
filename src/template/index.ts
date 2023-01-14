import fs from "fs";
import path from "path";

export function render_Msg(name: string, fileNamespace: string[],isBaseFile?: boolean) {
  let h = ""
  let tt = "";
  if(!isBaseFile && name.substring(name.length -3) !== 'Res'){
    const sid = fileNamespace[1]
    h = `
    this.setServiceId(SID.S_${sid.toUpperCase()});
    this.setCommandId(CID_${sid.toUpperCase()}.CID_${name});`
    tt = `import { SID, CID_${sid.toUpperCase()} } from '../PTPCommon';
`
  }

  let ttt = "";
  let tttt = "";
  if(!isBaseFile){
    tttt = "default "
    ttt = `import type { Pdu } from '../Pdu';
import type { ${name}_Type } from './types';\n\n`
  }

  return `${tt}${ttt}export ${tttt}class ${name} extends BaseMsg {
  constructor(msg?: ${name}_Type) {
    super('${fileNamespace.join(".")}.${name}', msg);${h}
  }
  getMsg(): ${name}_Type {
    return this.__getMsg();
  }
  decode(data: Uint8Array): ${name}_Type {
    return this.__D(data);
  }
  pack(): Pdu {
    return this.__pack();
  }
  static handlePdu(pdu: Pdu) {
    const msg = new ${name}().decode(pdu.getPbBody());
    return msg;
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
  return `import { Pdu } from './Pdu';

const PB = require('./protobuf');

let seq_num = 0;

export default class BaseMsg {
  private __sid?: any;
  private __cid?: any;
  private __msg?: any;
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
    this.__setMsg(msg);
  }
  protected setServiceId(sid: any) {
    this.__sid = sid;
  }
  protected setCommandId(cid: any) {
    this.__cid = cid;
  }
  protected __setMsg(msg: any) {
    this.__msg = msg;
  }
  protected __getMsg() {
    return this.__msg;
  }
  encode(): Uint8Array {
    return this.__E();
  }
  protected __E(): Uint8Array {
    const obj = this.__pb.create(this.__getMsg());
    return this.__pb.encode(obj).finish();
  }
  protected __D(data: Uint8Array): any {
    const obj = this.__pb.decode(data);
    return this.__pb.toObject(obj);
  }
  protected __pack(): pdu {
    const pdu = new Pdu();
    if (seq_num > 10000) {
      seq_num = 0;
    }
    pdu.writeData(this.__E(), this.__sid, this.__cid, ++seq_num);
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
  Object.keys(msgFiles).forEach(fileName=>{
    if(fileName !== 'PTPCommon'){
      const mm:string[] = []
      msgFiles[fileName].msgs.forEach((msg:any)=>{
        const t = msg.name.substring(msg.name.length - 3)
        if(t ==="Res" || msg.name.indexOf("Notify") > 0){
          mm.push(msg.name)
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

  let str = `switch (pdu.getServiceId()) {\n`;

  Object.keys(cidList).forEach((sid)=>{
    str += `      case SID.S_${sid.toUpperCase()}:\n`;
    str += `        switch (pdu.getCommandId()) {\n`;
    cidList[sid].forEach((cid)=>{
        str += `          case CID_${sid.toUpperCase()}.CID_${cid}:\n`;
        str += `            res = ${cid}.handlePdu(pdu);\n`;
        str += `            break;\n`;
    })
    str += `          default:\n`;
    str += `            console.warn('not found cid');\n`;
    str += `            break;\n`;
    str += `        }\n`;
    str += `        break;\n`;
  })
  str += `      default:\n`;
  str += `        console.warn('not found cid');\n`;
  str += `        break;\n`;
  str += `    }`;

  return `import type { Pdu } from './Pdu';
import {
  SID,
  CID_AUTH,
  CID_GROUP,
  CID_MSG,
  CID_BUDDY,
  CID_OTHER,
} from './PTPCommon';
${import1s}

const mapCidSid: any = {
  [SID.S_AUTH]: CID_AUTH,
  [SID.S_MSG]: CID_MSG,
  [SID.S_BUDDY]: CID_BUDDY,
  [SID.S_GROUP]: CID_GROUP,
  [SID.S_OTHER]: CID_OTHER,
};

export class MsgHandler {
  static handlePdu(pdu: Pdu): any {
    const sid = pdu.getServiceId();
    const cid = pdu.getCommandId();
    console.log(
      \`parse: $\{SID[sid]} => $\{sid}, $\{mapCidSid[sid][cid]} => $\{cid}\`
    );
    let res: any;
    ${str}
    return res;
  }
}
`
}
