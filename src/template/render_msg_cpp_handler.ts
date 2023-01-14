import fs from "fs";
import path from "path";
const rootDir = "/Users/jack/data/projects/ptp/bd-im/apps/bd_ws_server";
const rootBusinessDir =
  "/Users/jack/data/projects/ptp/bd-im/apps/bd_business_server";
let m_outCpp = "";
let m_outCppTest = "";
const author = "Barry";
const email = "dev.crypto@proton.me";
let cmake: string[] = [];

export const render_msg_cpp_handler = (msgFiles: any,outCpp?:string,outCppTest?:string) => {
  m_outCpp = outCpp!;
  m_outCppTest = outCppTest!;
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pair_maps: any = [];
  cmake = [];

  Object.keys(msgFiles).forEach((fileName) => {
    if (fileName !== "PTPCommon") {
      const actions: any = [];
      const root = msgFiles[fileName]["fileNamespace"][0];
      const sid = msgFiles[fileName]["fileNamespace"][1];
      msgFiles[fileName].msgs.forEach((item: any) => {
        const t = item.name.substring(item.name.length - 3);
        const file_name = item.name.replace("Req", "")+"Action";
        if (item.name.indexOf("Notify") > 0) {
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
          if (attach_data_row) {
            actions.push({
              cid: item.name,
              cid_rsp: item_rsp ? cid_rsp : null,
              fields: item.fields,
              fields_rsp: item_rsp ? item_rsp.fields : [],
            });
          }

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
    next_code = `\n            //msg.set_auth_id(pMsgConn->GetUserId());`
    next_code1 = `\n            //response->Next(&msg,CID_${cid},request->GetPdu()->GetSeqNum());`
  }

  if (item_rsp) {
    msg_rsp = `${root}::${sid}::${cid_rsp} msg_rsp;`;
    msg_response_send = `\n            //response->SendMsg(&msg_rsp,CID_${cid_rsp},request->GetPdu()->GetSeqNum());`;

    if (item_rsp) {
      res_fun_h = `\n    void ${cid_rsp}Action(CRequest* request, CResponse *response);`;
    }

    code_rsp = `if(error!= NO_ERROR){${res_error_field}
            response->SendMsg(&msg_rsp,CID_${cid_rsp},request->GetPdu()->GetSeqNum());
        }`;
    code_rsp_fun = `void ${cid_rsp}Action(CRequest* request, CResponse *response){
        ${root}::${sid}::${cid_rsp} msg;
        auto error = msg.error();
        while (true){
            if(!request->IsBusinessConn()){
              uint32_t handle = request->GetHandle();
              auto pMsgConn = FindMsgSrvConnByHandle(handle);
              if(!pMsgConn){
                  DEBUG_E("not found pMsgConn");
                  return;
              }
            }
            if(error != PTP::Common::NO_ERROR){
                break;
            }
            if(!msg.ParseFromArray(request->GetPdu()->GetBodyData(), (int)request->GetPdu()->GetBodyLength()))
            {
                error = E_PB_PARSE_ERROR;
                break;
            }
            break;
        }
        msg.set_error(error);
        response->SendMsg(&msg,CID_${cid_rsp},request->GetPdu()->GetSeqNum());
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

using namespace PTP::Common;

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest* request, CResponse *response){
        ${root}::${sid}::${cid} msg; 
        ${msg_rsp}
        ERR error = NO_ERROR;
        if(!request->IsBusinessConn()){
          auto pMsgConn = FindMsgSrvConnByHandle(request->GetHandle());
          if(!pMsgConn){
              DEBUG_E("not found pMsgConn");
              return;
          }
        }
        while (true){
            if(!msg.ParseFromArray(request->GetPdu()->GetBodyData(), (int)request->GetPdu()->GetBodyLength()))
            {
                error = E_PB_PARSE_ERROR;
                break;
            }${next_code}${next_code1}${msg_response_send}
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
#include "../Response.h"

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest *request, CResponse *response);${res_fun_h}
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

using namespace PTP::Common;

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest* request, CResponse *response){
        ${root}::${sid}::${cid} msg; 
        while (true){
            if(!msg.ParseFromArray(request->GetPdu()->GetBodyData(), (int)request->GetPdu()->GetBodyLength()))
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
#include "../Response.h"

namespace ACTION_${sid.toUpperCase()} {
    void ${cid}Action(CRequest* request, CResponse *response);
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
  const dir_path = path.join(rootBusinessDir, "src", "models");
  const pathname = path.join(dir_path, `Model${sid}.cpp`);
  const pathname_h = path.join(dir_path, `Model${sid}.h`);

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const funs: any = [];
  const fun_main: any = [];

  actions.forEach((action: any) => {
    let res_lines = [];
    if (action.cid_rsp) {
      fun_main.push(`void CModel${sid}::${action.cid}(PTP::${sid}::${action.cid}* msg, PTP::${sid}::${action.cid_rsp}* msg_rsp, ERR& error)
{
    CacheManager *pCacheManager = CacheManager::getInstance();
    CacheConn *pCacheConn = pCacheManager->GetCacheConn("group");

    while (true) {
        if (!pCacheConn) {
            error = PTP::Common::E_SYSTEM;
            log_error("error pCacheConn");
            break;
        }
        log("${action.cid}...");
        // auto fromUserId = msg->auth_uid();
        break;
    }
    
    if (pCacheConn) {
        pCacheManager->RelCacheConn(pCacheConn);
    }
}`);
      funs.push(
        `void ${action.cid}(PTP::${sid}::${action.cid}* msg, PTP::${sid}::${action.cid_rsp}* msg_rsp, ERR& error);`
      );

      res_lines = action.fields_rsp
        .filter((i: any) => i.name !== "attach_data")
        .map((field: any) => {
          return `//auto ${field.name} = msg_rsp.${field.name}();
    //log("${field.name}: %s",${field.name});
            `;
        });
    } else {
      fun_main.push(`void CModel${sid}::${action.cid}(PTP::${sid}::${action.cid}* msg, ERR& error)
{
    CacheManager *pCacheManager = CacheManager::getInstance();
    CacheConn *pCacheConn = pCacheManager->GetCacheConn("group");

    while (true) {
        if (!pCacheConn) {
            error = PTP::Common::E_SYSTEM;
            log_error("error pCacheConn");
            break;
        }
        log("${action.cid}...");
        // auto fromUserId = msg->auth_uid();
        break;
    }
    
    if (pCacheConn) {
        pCacheManager->RelCacheConn(pCacheConn);
    }
}`);
      funs.push(
        `void ${action.cid}(PTP::${sid}::${action.cid}* msg, ERR& error);`
      );

      res_lines = [];
    }

    const req_lines = action.fields
      .filter((i: any) => i.name !== "attach_data")
      .map((field: any) => {
        return `//msg.set_${field.name}();`;
      });

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
    ${funs.join("\n    ")}
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

${fun_main.join("\n")}

`;

  actions.forEach((action: any) => {
    const req_lines = action.fields
        .filter((i: any) => i.name !== "attach_data")
        .map((field: any) => {
          return `//msg.set_${field.name}();`;
        });
    let res_lines = [];
    let rsp_code = ``;
    if(action.cid_rsp){
      res_lines = action.fields_rsp
          .filter((i: any) => i.name !== "attach_data")
          .map((field: any) => {
            return `//auto ${field.name} = msg_rsp.${field.name}();
    //DEBUG_I("${field.name}: %s",${field.name});
            `;
          });
      rsp_code = `ASSERT_EQ(pPdu->GetCommandId(),CID_${action.cid_rsp});
    PTP::${sid}::${action.cid_rsp} msg_rsp;
    auto res = msg_rsp.ParseFromArray(pPdu->GetBodyData(), (int)pPdu->GetBodyLength());
    ASSERT_EQ(res,true);
    ${res_lines.join("\n    ")}`
    }
    let code_test = `#include <gtest/gtest.h>

#include "ptp_global/Logger.h"
#include "ptp_protobuf/ImPdu.h"
#include "ptp_server/MsgSrvConn.h"
#include "ptp_server/CachePool.h"
#include "ptp_server/actions/${action.cid.replace("Req","")}Action.h"
#include "PTP.${sid}.pb.h"
#include "PTP.Common.pb.h"

uint32_t accountId              = 1001;
#define CONFIG_PATH             "conf/bd_server.conf"

using namespace PTP::Common;

TEST(test_${sid}, ${action.cid.replace("Req","")}Action) {
    PTP::${sid}::${action.cid} msg;
    ${req_lines.join("\n    ")}
    CacheManager::setConfigPath(CONFIG_PATH);
    auto *pMsgSrvConn = new CMsgSrvConn();
    pMsgSrvConn->SetTest(true);
    pMsgSrvConn->SetHandle(100112);
    addMsgSrvConnByHandle(100112,pMsgSrvConn);
    ImPdu pdu;
    pdu.SetPBMsg(&msg,CID_${action.cid},0);
    pMsgSrvConn->HandlePdu(&pdu);
    auto pPdu = pMsgSrvConn->ReadTestPdu();
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
    // if(!fs.existsSync(test_pathname)){
    fs.writeFileSync(test_pathname, Buffer.from(code_test));
    // }
    const test_name = "test_" +sid+"_"+ action.cid.replace("Req","");
    cmake.push(`add_executable(${test_name}.run ${test_name}.cpp)
target_link_libraries(${test_name}.run PRIVATE gtest_main ptp_global ptp_protobuf ptp_server)`)
  })

  const test_dir_path = path.join(m_outCppTest);

  if (!fs.existsSync(test_dir_path)) {
    fs.mkdirSync(test_dir_path, { recursive: true });
  }

  if (!fs.existsSync(dir_path)) {
    // fs.mkdirSync(dir_path, { recursive: true });
  }
  if (!fs.existsSync(pathname_h)) {
    // fs.writeFileSync(pathname_h, Buffer.from(code_h));
  }
  if (!fs.existsSync(pathname)) {
    // fs.writeFileSync(pathname, Buffer.from(code));
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
