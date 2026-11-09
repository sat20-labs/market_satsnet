# RGB11 transcend 部署前技术登记（源码候选，2026-10-28）

基线 `8c11ce5aa5108e7e89f775d416a0190f66bd9a2d`，开始时工作树干净。本轮仅改 `app/transcend/create/page.tsx`、`api/market.ts`、`lib/walletAdapter.ts`、`lib/sat20PwaProvider.ts`。

选择 RGB11 L1 资产时，创建页从 ticker 元数据取得完整 ContractID 并核对所选资产；钱包仅导出公开 RGB11 合约文件；市场调用 STP Core 的 `/v3/rgb11/contracts/register`；收到同 ContractID/SchemaID 的登记响应后，再调用钱包 SDK 读取并验证 Core 签名的公共记录和完整合约字节；成功后才发起 transcend 部署。登记是独立幂等步骤，部署失败不回滚登记。BTC、ordx、runes、brc20 原流程不增 RGB11 登记门槛。

市场与钱包网络在登记前和部署前核对。登记 HTTP 返回不确定时先用钱包 SDK 按完整 ContractID 查询签名读回；只有同一公开合约得到确认才继续部署。公开资料缺失、登记未确认、读回不符或网络切换时均停止部署。发行人 DID 不参与技术登记。市场不上传钱包的完整私有 consignment。

此文件记录源码意图，**尚未构建、运行测试、访问服务或部署**。市场只验证 SDK 的签名读回结果；Core 的服务端验证是必需的独立门槛。当前 SDK/聪网链上 AssetName 仍是完整 ContractID hex；已定短正式名和 DID 别名的协议身份接线另待确认，不能将本轮登记误报为短名已落地。
