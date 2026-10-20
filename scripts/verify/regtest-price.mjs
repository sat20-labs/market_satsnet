import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
let failed=0;
for (const [name,path] of [['SatoshiNet','../../api/market.ts'],['Bitcoin','../../../market/api/request.ts']]) {
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
  const node=tree.statements.find(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>d.name.getText(tree)==='getBTCPrice'));
  assert.ok(node,`${name} real price function found`);
  const code=ts.transpileModule(node.getText(tree),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  for(const network of ['mainnet','testnet','regtest']) {
    let calls=0;const exports={};
    vm.runInNewContext(code,{exports,process:{env:{NEXT_PUBLIC_NETWORK:network}},getConfiguredNetwork:()=>network,
      request:async()=>{calls++;return {code:0,data:{amount:'77777'}}}});
    try {
      const result=await exports.getBTCPrice();
      assert.equal(calls,network==='regtest'?0:1,'regtest must not request live prices');
      assert.equal(Number(result.data.amount),network==='regtest'?100000:77777);
      console.log(`PASS ${name} ${network}`);
    }catch(e){failed++;console.error(`FAIL ${name} ${network}: ${e.message}`);}
  }
}
console.log(JSON.stringify({passed:6-failed,failed,total:6}));process.exitCode=failed?1:0;
