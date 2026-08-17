import json
import pytest

def address(account):
    return "0x" + bytes(account).hex()

def contract_address(account):
    from genlayer.py.types import Address
    return Address(bytes(account))

def policy(owner):
    return {"policy_id":"pol_alpha","holder":address(owner),"protocol":"genlayer","validator":"validator-1","coverage_start_ts":1,"coverage_end_ts":9999999999,"coverage_limit":500,"covered_events":["MISSED_EXECUTION_WINDOW"],"exclusions":[],"deductible_bps":500,"payout_rule":"min(eligible_loss_after_deductible, coverage_limit)","policy_commitment":"p"}

def test_policy_and_claim_are_contract_state(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py')
    p=policy(direct_alice); c.create_policy('pol_alpha',json.dumps(p),'p')
    assert json.loads(c.get_policy('pol_alpha'))['holder'] == address(direct_alice)
    claim={"policy_id":"pol_alpha","claimant":address(direct_alice),"validator":"validator-1","documented_loss":100,"incident_at_ts":2,"underlying_finality":"FINAL"}
    c.submit_claim('clm_beta','pol_alpha',json.dumps(claim),'e0')
    assert json.loads(c.get_claim('clm_beta'))['state']=='AWAITING_FINALITY'

def test_evidence_is_persisted_and_rotated_adapter_promotes_finality(direct_vm,direct_deploy,direct_alice,direct_bob,direct_charlie):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py'); p=policy(direct_alice); c.create_policy('pol_alpha',json.dumps(p),'p')
    c.submit_claim('clm_beta','pol_alpha',json.dumps({"policy_id":"pol_alpha","claimant":address(direct_alice),"validator":"validator-1","documented_loss":100,"incident_at_ts":2}),'e0')
    e={"kind":"CLAIMANT_ASSERTION","source":"claimant","reference":"claimant-ref","commitment":"e1","finality":"UNVERIFIED"}; c.append_evidence('clm_beta',json.dumps(e),'e1')
    assert len(json.loads(c.get_evidence('clm_beta')))==1
    assert json.loads(c.get_claim('clm_beta'))['state']=='AWAITING_FINALITY'
    protocol={"kind":"PROTOCOL_FACT","protocol":"genlayer","validator":"validator-1","claim_id":"clm_beta","source":"GENLAYER_STAKING_ADAPTER","reference":"https://evidence.example/final-record-1","observed_at_ts":2,"source_record_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","finality":"FINAL"}
    direct_vm.sender=direct_charlie
    with direct_vm.expect_revert('protocol authority required'): c.record_protocol_finality('clm_beta',json.dumps(protocol))
    direct_vm.sender=direct_alice; c.propose_protocol_authority(contract_address(direct_bob))
    direct_vm.sender=direct_bob; c.accept_protocol_authority(); c.record_protocol_finality('clm_beta',json.dumps(protocol))
    assert json.loads(c.get_claim('clm_beta'))['state']=='UNDER_REVIEW'
