import fs from "fs";
import path from "path";
import {render_msg_handler} from "./index";
let m_outDir = "";
let m_outCpp = "";
let m_outCppTest = "";
let m_outCppCommandDir = "";
let m_writeActionIfExists = false;
const author = "Barry";
const email = "dev.crypto@proton.me";
let cmake: string[] = [];

export const render_msg_cpp_handler = (msgFiles: any,outDir:any,outCpp?:string,outCppTest?:string,outCppCommandDir?:string,writeActionIfExists?:boolean) => {
  m_outDir = outDir!;
  m_outCpp = outCpp!;
  m_outCppCommandDir = outCppCommandDir!;
  m_outCppTest = outCppTest!;
  m_writeActionIfExists = writeActionIfExists!;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pair_maps: any = [];
  cmake = [];
  let cids:any = [];
  let i = 0;
  Object.keys(msgFiles).forEach((fileName) => {
    if (fileName !== "PTPCommon") {
      const actions: any = [];
      const root = msgFiles[fileName]["fileNamespace"][0];
      const sid = msgFiles[fileName]["fileNamespace"][1];
      i += 1000
      let j = i;
      msgFiles[fileName].msgs.forEach((item: any) => {
        cids.push([`CID_${item.name}`,++j])
        const t = item.name.substring(item.name.length - 3);
        const file_name = item.name.replace("Req", "")+"Action";
        if (item.name.indexOf("Notify") > 0) {
          actions.push({
            cid: item.name,
            cid_rsp: null,
            fields: item.fields,
            fields_rsp: [],
          });
          render_notify({ item, pair_maps, root, sid, file_name, date });
        }
        if (t === "Req") {
          const cid_rsp =
            t === "Req" ? item.name.replace("Req", "Res") : item.name;
          const item_rsp = msgFiles[fileName].msgs.find(
            (row: any) => row.name === cid_rsp
          );

          const attach_data_row = item.fields.find(
            (row: any) => row.name === "attach_data"
          );
          actions.push({
            cid: item.name,
            cid_rsp: item_rsp ? cid_rsp : null,
            fields: item.fields,
            fields_rsp: item_rsp ? item_rsp.fields : [],
          });

          render_actions({
            item,
            item_rsp,
            pair_maps,
            root,
            sid,
            file_name,
            cid_rsp,
            date,
          });
        }
      });
      render_model({ sid, actions });
    }
  });
  console.log(cids)
  const ttt = cids.map((row:any)=>{
    return `${row[0]} = ${row[1]},`
  }).join("\n  ");

  const ttt_js = cids.map((row:any)=>{
    return `${row[0]} = ${row[1]},`
  }).join("\n  ");


  const ttt_js1 = cids.map((row:any)=>{
    return `${row[1]}: "${row[0]}",`
  }).join("\n  ");

  const ttt1 = cids.map((row:any)=>{
    return `\n        case ${row[0]}:\n            return to_string(cid) + ":${row[0]}";`
  }).join("");

  const pathname_ActionCommandIds_h = path.join(m_outCppCommandDir, `ActionCommands.h`);
  const pathname_ActionCommandIds = path.join(m_outCppCommandDir, `ActionCommands.cpp`);
  fs.writeFileSync(pathname_ActionCommandIds_h, Buffer.from(`/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ActionCommands.h
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc： DO NOT EDIT!!
 *
 #pragma once
================================================================*/
#ifndef __ActionCommands_H__
#define __ActionCommands_H__

#include <string>

using namespace std;

enum ActionCommands {
  ${ttt}
};

string getActionCommandsName(ActionCommands cid);

#endif /* __ActionCommands_H__ */
`));

fs.writeFileSync(pathname_ActionCommandIds, Buffer.from(`#include "ActionCommands.h"

string getActionCommandsName(ActionCommands cid){
    switch (cid) {${ttt1}
        default:
            return to_string(cid);
    }
}
`));

  const jsActionCommands = `export enum ActionCommands {
  ${ttt_js}
}

export const ActionCommandsName = {
  ${ttt_js1}
};

export const getActionCommandsName = (cid:ActionCommands)=>{
   return ActionCommandsName[cid] || cid.toString();
}

`;
  fs.writeFileSync(path.join(outDir, "ActionCommands.ts"), Buffer.from(jsActionCommands))
  //
  // const msgHandlerCode = render_msg_handler(msgFiles);
  // fs.writeFileSync(path.join(outDir, "MsgHandler.ts"), Buffer.from(msgHandlerCode))

  const test_dir_path = path.join(m_outCppTest);
  fs.writeFileSync(path.join(test_dir_path,"CMakeLists.txt"), Buffer.from(cmake.join("\n\n")));
  render_conn_map(pair_maps);
};

function render_actions({
  item,
  item_rsp,
  pair_maps,
  root,
  sid,
  file_name,
  cid_rsp,
  date,
}: any) {
  const cid = item.name;
  const attach_data_row = item.fields.find(
    (row: any) => row.name === "attach_data"
  );
  const auth_uid_row = item.fields.find(
      (row: any) => row.name === "auth_uid"
  );
  if (!attach_data_row) {
    item_rsp = false;
  }
  const res_has_error_field = item_rsp
    ? item_rsp.fields.find((row: any) => row.name === "error")
    : null;

  pair_maps.push({
    file_path: `${file_name}`,
    cid: cid,
    sid: sid,
    cid_rsp: item_rsp ? cid_rsp : null,
  });
  let res_error_field = "";
  if (res_has_error_field) {
    res_error_field = `\n            msg_rsp.set_error(error);`;
  }
  let code_rsp = "";
  let code_rsp_fun = "";
  let res_fun_h = "";
  let msg_rsp = "";
  let msg_response_send = "";
  let next_code = "";
  let next_code1 = "";
  if(auth_uid_row){
    next_code = `\n             msg.set_auth_uid(pMsgConn->GetUserId());`
    next_code1 =`\n             request->Next(&msg,CID_${cid},request->GetSeqNum());`
  }

  if (item_rsp) {
    msg_rsp = `${root}::${sid}::${cid_rsp} msg_rsp;`;
    msg_response_send = `\n                CacheManager *pCacheManager = CacheManager::getInstance();
                CacheConn *pCacheConn = pCacheManager->GetCacheConn(CACHE_GROUP_INSTANCE);
                while (true) {
                    if (!pCacheConn) {
                        error = PTP::Common:: E_SYSTEM;
                        DEBUG_E("error pCacheConn");
                        break;
                    }
                    auto auth_uid = msg.auth_uid();
                    msg_rsp.set_error(error);
                    msg_rsp.set_auth_uid(auth_uid);
                    break;
                }

                if (pCacheConn) {
                    pCacheManager->RelCacheConn(pCacheConn);
                }
                request->SendResponseMsg(&msg_rsp,CID_${cid_rsp},request->GetSeqNum());`;

    if (item_rsp) {
      res_fun_h = `\n    void ${cid_rsp}Action(CRequest* request);`;
    }

    code_rsp = `if(error!= NO_ERROR){${res_error_field}
            request->SendResponseMsg(&msg_rsp,CID_${cid_rsp},request->GetSeqNum());
        }`;
    code_rsp_fun = `void ${cid_rsp}Action(CRequest* request){
        // ${root}::${sid}::${cid_rsp} msg;
        // auto error = msg.error();
        // while (true){
        //     if(!msg.ParseFromArray(request->GetRequestPdu()->GetBodyData(), (int)request->GetRequestPdu()->GetBodyLength()))
        //     {
        //         error = E_PB_PARSE_ERROR;
        //         break;
        //     }
        //     if(!request->IsBusinessConn()){
        //       uint32_t handle = request->GetHandle();
        //       auto pMsgConn = FindMsgSrvConnByHandle(handle);
        //       if(!pMsgConn){
        //           DEBUG_E("not found pMsgConn");
        //           return;
        //       }
        //       if(error != PTP::Common::NO_ERROR){
        //           break;
        //       }
        //     }else{
        //       if(error != PTP::Common::NO_ERROR){
        //           break;
        //       }
        //     }
        //     break;
        // }
        // msg.set_error(error);
        // request->SendResponseMsg(&msg,CID_${cid_rsp},request->GetSeqNum());
        request->SendResponsePdu(request->GetRequestPdu());
    }`;
  } else {
  }
  const tmpl_cmd_cpp = `/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ${file_name}.cpp
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc：
 *
================================================================*/
#include "${file_name}.h"
#include "PTP.${sid}.pb.h"
#include "MsgSrvConn.h"
#include "models/Model${sid}.h"

using namespace PTP::Common;

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest* request){
        ${root}::${sid}::${cid} msg; 
        ${msg_rsp}
        ERR error = NO_ERROR;
        while (true){
            if(!msg.ParseFromArray(request->GetRequestPdu()->GetBodyData(), (int)request->GetRequestPdu()->GetBodyLength()))
            {
                error = E_PB_PARSE_ERROR;
                break;
            }
            if(!request->IsBusinessConn()){
              auto pMsgConn = FindMsgSrvConnByHandle(request->GetHandle());
              if(!pMsgConn){
                  DEBUG_E("not found pMsgConn");
                  return;
              }${next_code}${next_code1}
            }else{${msg_response_send}
            }
            break;
        }
        ${code_rsp}
    }
    ${code_rsp_fun}
};

`;
  const tmpl_cmd_h = `/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ${file_name}.h
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc： DO NOT EDIT!!
 *
 #pragma once
================================================================*/
#ifndef __${file_name.toUpperCase()}_H__
#define __${file_name.toUpperCase()}_H__

#include "../Request.h"

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest *request);${res_fun_h}
};

#endif /*defined(__${file_name.toUpperCase()}_H__) */
`;
  write_file({ root, sid, file_name, tmpl_cmd_cpp, tmpl_cmd_h });
}

function render_notify({ item, pair_maps, root, sid, file_name, date }: any) {
  const cid = item.name;

  pair_maps.push({
    file_path: `${file_name}`,
    sid:sid,
    cid_rsp: cid,
  });
  const tmpl_cmd_cpp = `/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ${file_name}.cpp
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc：
 *
================================================================*/
#include "${file_name}.h"
#include "PTP.${sid}.pb.h"
#include "models/Model${sid}.h"

using namespace PTP::Common;

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest* request){
        ${root}::${sid}::${cid} msg; 
        while (true){
            if(!msg.ParseFromArray(request->GetRequestPdu()->GetBodyData(), (int)request->GetRequestPdu()->GetBodyLength()))
            {
                break;
            }
            break;
        }
    }
};

`;
  const tmpl_cmd_h = `/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ${file_name}.h
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc： 
 *
 #pragma once
================================================================*/
#ifndef __${file_name.toUpperCase()}_H__
#define __${file_name.toUpperCase()}_H__

#include "../Request.h"

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest* request);
};

#endif /*defined(__${file_name.toUpperCase()}_H__) */
`;
  write_file({ root, sid, file_name, tmpl_cmd_cpp, tmpl_cmd_h });
}

function render_conn_map(rows: any) {
  const includes: string[] = [];
  const maps: string[] = [];
  const maps_callback: string[] = [];
  rows.forEach((row: any) => {
    includes.push(`#include "actions/${row.file_path}.h"`);
    if (row.cid) {
      maps.push(
        `m_handler_map.insert(make_pair(uint32_t(CID_${row.cid}), ACTION_${row.sid.toUpperCase()}::${row.cid}Action));`
      );
    }
    if (row.cid_rsp) {
      maps.push(
          `m_handler_map.insert(make_pair(uint32_t(CID_${row.cid_rsp}), ACTION_${row.sid.toUpperCase()}::${row.cid_rsp}Action));`
      );
    }
  });

  const code = `#include "HandlerMap.h"
#include "ActionCommands.h"
${includes.join("\n")}
using namespace PTP::Common;

void CHandlerMap::Init()
{
    ${maps.join("\n    ")}
}

CHandlerMap* CHandlerMap::s_handler_instance = NULL;
/**
 *  构造函数
 */
CHandlerMap::CHandlerMap(){}

/**
 *  析构函数
 */
CHandlerMap::~CHandlerMap(){}

/**
 *  单例
 *
 *  @return 返回指向CHandlerMap的单例指针
 */
CHandlerMap* CHandlerMap::getInstance()
{
\tif (!s_handler_instance) {
\t\ts_handler_instance = new CHandlerMap();
\t}
\treturn s_handler_instance;
}


/**
 *  通过commandId获取处理函数
 *
 *  @param pdu_cid commandId
 *
 *  @return 处理函数的函数指针
 */
pdu_handler_t CHandlerMap::GetHandler(uint32_t pdu_cid)
{
\tauto it = m_handler_map.find(pdu_cid);
\tif (it != m_handler_map.end()) {
\t\treturn it->second;
\t} else {
\t\treturn NULL;
\t}
}
`;
  const dir_path = path.join(m_outCpp);
  const pathname = path.join(dir_path, `HandlerMap.cpp`);

  // if(!fs.existsSync(pathname)){
  fs.writeFileSync(pathname, Buffer.from(code));
  // }
}

function render_model({ sid, actions }: any) {
  const file_name = `Model${sid}`;
  const pathname = path.join(m_outCpp, "models", `Model${sid}.cpp`);
  const pathname_h = path.join(m_outCpp,"models", `Model${sid}.h`);
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let code_h = `/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ${file_name}.h
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc：DO NOT EDIT!!
 *
 *
 ================================================================*/

#ifndef MODEL_${sid.toUpperCase()}_H_
#define MODEL_${sid.toUpperCase()}_H_

#include "PTP.${sid}.pb.h"

using namespace std;
using namespace PTP::Common;

class CModel${sid} {
public:
virtual ~CModel${sid}();
    static CModel${sid}* getInstance();
private:
    CModel${sid}();
private:
    static CModel${sid}*    m_pInstance;
};

#endif /* MODEL_${sid.toUpperCase()}_H_ */
`;

  let code = `/*================================================================
 *   Copyright (C) 2022 All rights reserved.
 *
 *   filename：  ${file_name}.cpp
 *   author：    ${author}
 *   email：     ${email}
 *   createdAt： ${date}
 *   desc：
 *
 *
================================================================*/
#include "${file_name}.h"
#include "CachePool.h"

CModel${sid}* CModel${sid}::m_pInstance = NULL;

CModel${sid}::CModel${sid}()
{
    
}

CModel${sid}::~CModel${sid}()
{
    
}

CModel${sid}* CModel${sid}::getInstance()
{
    if (m_pInstance == NULL) {
        m_pInstance = new CModel${sid}();
    }
    return m_pInstance;
}
`;

  actions.forEach((action: any) => {
    const req_lines = action.fields
        .filter((i: any) => i.name !== "attach_data")
        .filter((i: any) => i.name !== "auth_uid")
        .map((field: any) => {
          return `//msg_${action.cid}.set_${field.name}();`;
        });
    let res_lines = [];
    let rsp_code = ``;
    if(action.cid_rsp){
      res_lines = action.fields_rsp
          .filter((i: any) => i.name !== "error")
          .filter((i: any) => i.name !== "attach_data")
          .map((field: any) => {
            if(field.fieldType == 'string' || field.isBytes){
              return `//auto ${field.name} = msg_${action.cid_rsp}.${field.name}();
            //DEBUG_I("${field.name}: %s",${field.name}.c_str());`;
            }else if(field.fieldType == 'number'){
              return `//auto ${field.name} = msg_${action.cid_rsp}.${field.name}();
            //DEBUG_I("${field.name}: %d",${field.name});`;
            }else{
              return `//auto ${field.name} = msg_${action.cid_rsp}.${field.name}();
            //DEBUG_I("${field.name}: %p",${field.name});`
            }
          });
      rsp_code = `if(request_${action.cid}.HasNext()){
        auto pdu_next_${action.cid} = request_${action.cid}.GetNextResponsePdu();
        ASSERT_EQ(pdu_next_${action.cid}->GetSeqNum(),sep_no);
        ASSERT_EQ(pdu_next_${action.cid}->GetCommandId(),CID_${action.cid});

        CRequest request_next_${action.cid};
        request_next_${action.cid}.SetIsBusinessConn(true);
        request_next_${action.cid}.SetRequestPdu(pdu_next_${action.cid});
        
        ACTION_${sid.toUpperCase()}::${action.cid}Action(&request_next_${action.cid});

        if(request_next_${action.cid}.HasNext()){}
        if(request_next_${action.cid}.GetResponsePdu()){
            PTP::${sid}::${action.cid_rsp} msg_${action.cid_rsp};
            auto res = msg_${action.cid_rsp}.ParseFromArray(request_next_${action.cid}.GetResponsePdu()->GetBodyData(), (int)request_next_${action.cid}.GetResponsePdu()->GetBodyLength());
            ASSERT_EQ(res,true);
            ASSERT_EQ(request_next_${action.cid}.GetResponsePdu()->GetCommandId(),CID_${action.cid_rsp});
            auto error = msg_${action.cid_rsp}.error();
            ASSERT_EQ(error,NO_ERROR);
            ${res_lines.join("\n            ")}
            
            CRequest request_${action.cid_rsp};
            request_${action.cid_rsp}.SetIsBusinessConn(false);
            request_${action.cid_rsp}.SetHandle(pMsgConn->GetHandle());
            request_${action.cid_rsp}.SetRequestPdu(request_next_${action.cid}.GetResponsePdu());
            
            ACTION_${sid.toUpperCase()}::${action.cid_rsp}Action(&request_${action.cid_rsp});
            
            if(request_${action.cid_rsp}.HasNext()){}
            if(request_${action.cid_rsp}.GetResponsePdu()){
                PTP::${sid}::${action.cid_rsp} msg_final_${action.cid_rsp};
                res = msg_final_${action.cid_rsp}.ParseFromArray(request_${action.cid_rsp}.GetResponsePdu()->GetBodyData(), (int)request_${action.cid_rsp}.GetResponsePdu()->GetBodyLength());
                ASSERT_EQ(res,true);
                ASSERT_EQ(request_${action.cid_rsp}.GetResponsePdu()->GetCommandId(),CID_${action.cid_rsp});
                error = msg_final_${action.cid_rsp}.error();
                ASSERT_EQ(error,NO_ERROR);
            }
        }
      }`
    }
    let code_test = `#include <gtest/gtest.h>

#include "test_init.h"
#include "ptp_server/actions/${action.cid.replace("Req","")}Action.h"
#include "ptp_server/actions/models/Model${sid}.h"
#include "PTP.${sid}.pb.h"

using namespace PTP::Common;

TEST(test_${sid}, ${action.cid.replace("Req","")}Action) {
    auto *pMsgConn = test_int_msg_conn();
    PTP::${sid}::${action.cid} msg_${action.cid};
    ${req_lines.join("\n    ")}
    uint16_t sep_no = 1;
    ImPdu pdu_${action.cid};
    pdu_${action.cid}.SetPBMsg(&msg_${action.cid},CID_${action.cid},sep_no);
    CRequest request_${action.cid};
    request_${action.cid}.SetHandle(pMsgConn->GetHandle());
    request_${action.cid}.SetRequestPdu(&pdu_${action.cid});
    
    ACTION_${sid.toUpperCase()}::${action.cid}Action(&request_${action.cid});
    
    ${rsp_code}
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
`;

    const test_dir_path = path.join(m_outCppTest);
    const test_pathname = path.join(test_dir_path, `test_${sid}_${action.cid.replace("Req","")}.cpp`);

    if (!fs.existsSync(test_dir_path)) {
      fs.mkdirSync(test_dir_path, { recursive: true });
    }
    if(m_writeActionIfExists || !fs.existsSync(test_pathname)){
      fs.writeFileSync(test_pathname, Buffer.from(code_test));
    }
    const test_name = "test_" +sid+"_"+ action.cid.replace("Req","");
    cmake.push(`add_executable(${test_name}.run ${test_name}.cpp)
target_link_libraries(${test_name}.run PRIVATE gtest_main test_init ptp_net ptp_global ptp_protobuf ptp_server)`)
  })

  const test_dir_path = path.join(m_outCppTest);

  if (!fs.existsSync(test_dir_path)) {
    fs.mkdirSync(test_dir_path, { recursive: true });
  }

  const test_dir_model_path = path.join(m_outCpp,"models");

  if (!fs.existsSync(test_dir_model_path)) {
    fs.mkdirSync(test_dir_model_path, { recursive: true });
  }

  if (!fs.existsSync(pathname_h)) {
    fs.writeFileSync(pathname_h, Buffer.from(code_h));
  }
  if (!fs.existsSync(pathname)) {
    fs.writeFileSync(pathname, Buffer.from(code));
  }
}

function write_file({ file_name, tmpl_cmd_cpp, tmpl_cmd_h }: any) {
  const dir_path = path.join(m_outCpp);
  const pathname = path.join(dir_path, `${file_name}.cpp`);
  const pathname_h = path.join(dir_path, `${file_name}.h`);
  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true });
  }
  if (!fs.existsSync(pathname)) {
    fs.writeFileSync(pathname, Buffer.from(tmpl_cmd_cpp));
  }
  if (!fs.existsSync(pathname_h)) {
    fs.writeFileSync(pathname_h, Buffer.from(tmpl_cmd_h));
  }
}
