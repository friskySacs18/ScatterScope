import {rpcEndpoint} from './rpc-transport.js';
import {signerConfiguration} from './privy-signer.js';

export function operatorConfiguration(env={}){
  const token=env.CANARY_PREPARE_TOKEN;
  if(typeof token!=='string'||token.length===0)return {configured:false,code:'operator_token_missing',message:'Add CANARY_PREPARE_TOKEN to the order Worker runtime Variables and Secrets, then deploy. Build variables are not runtime secrets.'};
  if(token.length<32||token.length>256||token!==token.trim()||!/^[\x21-\x7e]+$/.test(token))return {configured:false,code:'operator_token_invalid',message:'CANARY_PREPARE_TOKEN must contain 32–256 printable characters without spaces. Update the runtime secret and deploy.'};
  return {configured:true,code:null,message:null};
}
export function serviceConfiguration(env={}){
  let rpcConfigured=false;
  try{rpcEndpoint(env.RPC_URL);rpcConfigured=true}catch{}
  const operator=operatorConfiguration(env),signer=signerConfiguration(env);
  const serviceTokenConfigured=typeof env.ORDER_SERVICE_TOKEN==='string'&&/^[\x21-\x7e]{32,256}$/.test(env.ORDER_SERVICE_TOKEN);
  const contextConfigured=!!env.ORDER_CONTEXT?.fetch||typeof env.ORDER_CONTEXT_TOKEN==='string'&&/^[\x21-\x7e]{32,256}$/.test(env.ORDER_CONTEXT_TOKEN),journalConfigured=!!env.ACCOUNT_ORDERS;
  const executionEnabled=rpcConfigured&&signer.configured&&serviceTokenConfigured&&contextConfigured&&journalConfigured&&env.SCOPE_EXECUTION_ENABLED==='true'&&env.SCOPE_ORDER_KILL_SWITCH==='false';
  return {rpcConfigured,operator,signer,canaryPreparationConfigured:rpcConfigured&&operator.configured,
    journalConfigured,contextConfigured,serviceTokenConfigured,executionEnabled,
    blockers:[...(!rpcConfigured?['rpc_not_configured']:[]),
      ...signer.missing.map(x=>'missing_'+x),...signer.invalid.map(x=>'invalid_'+x),
      ...(!serviceTokenConfigured?['order_service_token_missing_or_invalid']:[]),...(!contextConfigured?['verified_order_context_not_connected']:[]),
      ...(!journalConfigured?['order_journal_not_connected']:[]),...(env.SCOPE_EXECUTION_ENABLED!=='true'?['execution_switch_off']:[]),
      ...(env.SCOPE_ORDER_KILL_SWITCH!=='false'?['kill_switch_on']:[])]};
}
