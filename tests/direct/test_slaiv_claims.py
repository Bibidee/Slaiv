import json
import pytest

def address(account):
    return "0x" + bytes(account).hex()

def contract_address(account):
    from genlayer.py.types import Address
    return Address(bytes(account))

def policy(owner):
    return {"policy_id":"pol_alpha","holder":address(owner),"protocol":"genlayer","subject_network":"studionet","validator":"validator-1","coverage_start_ts":1,"coverage_end_ts":9999999999,"coverage_limit":500,"covered_events":["MISSED_EXECUTION_WINDOW"],"exclusions":[],"deductible_bps":500,"payout_rule":"min(eligible_loss_after_deductible, coverage_limit)","policy_commitment":"p"}

def evidence(claim_id, evidence_id, kind="CLAIMANT_ASSERTION"):
    return {"claim_id":claim_id,"evidence_id":evidence_id,"kind":kind,"source":"test source","reference":"https://evidence.example/"+evidence_id,"content_hash":"a"*64,"submitted_at":2}

def test_policy_and_claim_are_contract_state(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py')
    p=policy(direct_alice); c.create_policy('pol_alpha',p,'p')
    assert json.loads(c.get_policy('pol_alpha'))['holder'] == address(direct_alice)
    claim={"policy_id":"pol_alpha","claimant":address(direct_alice),"validator":"validator-1","documented_loss":100,"incident_at_ts":2,"underlying_finality":"FINAL"}
    c.submit_claim('clm_beta','pol_alpha',claim,'e0')
    assert json.loads(c.get_claim('clm_beta'))['state']=='AWAITING_FINALITY'

def test_evidence_is_persisted_and_rotated_adapter_promotes_finality(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py'); p=policy(direct_alice); c.create_policy('pol_alpha',p,'p')
    c.submit_claim('clm_beta','pol_alpha',{"policy_id":"pol_alpha","claimant":address(direct_alice),"validator":"validator-1","documented_loss":100,"incident_at_ts":2},'e0')
    e=evidence('clm_beta','evd_claimant'); c.append_evidence('clm_beta',e,'a'*64)
    assert len(json.loads(c.get_evidence('clm_beta')))==1
    assert json.loads(c.get_claim('clm_beta'))['state']=='AWAITING_FINALITY'
    protocol=evidence('clm_beta','evd_protocol','PROTOCOL_FACT')|{"protocol":"genlayer","validator":"validator-1","source":"GENLAYER_STAKING_ADAPTER","network":"studionet","event_id":"evt_beta","finality":"FINAL"}
    direct_vm.sender=direct_charlie
    with direct_vm.expect_revert('protocol authority required'): c.record_protocol_finality('clm_beta',protocol)
    direct_vm.sender=direct_alice; c.propose_protocol_authority(contract_address(direct_bob))
    direct_vm.sender=direct_bob; c.accept_protocol_authority(); c.record_protocol_finality('clm_beta',protocol)
    assert json.loads(c.get_claim('clm_beta'))['state']=='UNDER_REVIEW'

def test_protocol_finality_rejects_unfingerprinted_evidence(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py'); c.create_policy('pol_alpha',policy(direct_alice),'p')
    c.submit_claim('clm_bad','pol_alpha',{"policy_id":"pol_alpha","claimant":address(direct_alice),"validator":"validator-1","documented_loss":100,"incident_at_ts":2},'e0')
    bad={"kind":"PROTOCOL_FACT","protocol":"genlayer","validator":"validator-1","claim_id":"clm_bad","source":"GENLAYER_STAKING_ADAPTER","reference":"https://evidence.example/final-record","submitted_at":2,"network":"studionet","event_id":"evt_bad","finality":"FINAL"}
    with direct_vm.expect_revert('invalid protocol evidence'): c.record_protocol_finality('clm_bad',bad)
    assert json.loads(c.get_claim('clm_bad'))['state']=='AWAITING_FINALITY'

def test_full_review_appeal_and_finalization_lifecycle(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py')
    c.create_policy('pol_full',policy(direct_alice)|{'policy_id':'pol_full'},'p-full')
    claim={'policy_id':'pol_full','claimant':address(direct_alice),'validator':'validator-1','documented_loss':100,'incident_at_ts':2}
    c.submit_claim('clm_full','pol_full',claim,'claim-full')
    c.append_evidence('clm_full',evidence('clm_full','evd_full'),'a'*64)
    protocol=evidence('clm_full','evd_protocol_full','PROTOCOL_FACT')|{'protocol':'genlayer','validator':'validator-1','source':'GENLAYER_STAKING_ADAPTER','network':'studionet','event_id':'evt_full','content_hash':'b'*64,'finality':'FINAL'}
    c.record_protocol_finality('clm_full',protocol)
    verdict={'eligibility':'PARTIALLY_APPROVED','incident_class':'MISSED_EXECUTION_WINDOW','claim_id':'clm_full','policy_id':'pol_full','validator':'validator-1','slash_final':True,'covered_event':True,'exclusion_triggered':False,'eligible_loss':80,'confidence':1,'supported_evidence_ids':['evd_full','evd_protocol_full'],'reasoning_summary':'test'}
    direct_vm.mock_llm(r'.*Apply policy literally.*',json.dumps(verdict))
    c.review_slashing_claim('clm_full')
    assert json.loads(c.get_review('clm_full'))['eligibility']=='PARTIALLY_APPROVED'
    c.record_appeal('clm_full','Material evidence shows the documented loss was complete.',evidence('clm_full','evd_appeal'))
    direct_vm.clear_mocks(); direct_vm.mock_llm(r'.*Return JSON only with disposition.*',json.dumps({'disposition':'OVERTURN','verdict':verdict|{'eligibility':'APPROVED','eligible_loss':100,'supported_evidence_ids':['evd_full','evd_protocol_full','evd_appeal']}}))
    c.review_appeal('clm_full')
    assert json.loads(c.get_effective_review('clm_full'))['eligibility']=='APPROVED'
    c.finalize_claim('clm_full')
    assert json.loads(c.get_claim('clm_full'))['state']=='FINAL'
    assert c.get_payout('clm_full')==95
    assert 'pol_full' in json.loads(c.get_user_policies(contract_address(direct_alice)))
