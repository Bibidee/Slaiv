import json
import pytest

def policy(owner):
    return {"policy_id":"pol_alpha","holder":str(owner).lower(),"protocol":"genlayer","validator":"validator-1","coverage_start_ts":1,"coverage_end_ts":9999999999,"coverage_limit":500,"covered_events":["MISSED_EXECUTION_WINDOW"],"exclusions":[],"deductible_bps":500,"payout_rule":"min(eligible_loss_after_deductible, coverage_limit)","policy_commitment":"p"}

def test_policy_and_claim_are_contract_state(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py')
    p=policy(direct_alice); c.create_policy('pol_alpha',json.dumps(p),'p')
    assert 'pol_alpha' in c.get_user_policies(direct_alice)
    claim={"policy_id":"pol_alpha","claimant":str(direct_alice).lower(),"validator":"validator-1","documented_loss":100,"incident_at_ts":2,"underlying_finality":"FINAL"}
    c.submit_claim('clm_beta','pol_alpha',json.dumps(claim),'e0')
    assert json.loads(c.get_claim('clm_beta'))['state']=='AWAITING_FINALITY'

def test_claimant_evidence_is_persisted_but_cannot_finalize(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice; c=direct_deploy('contracts/SlaivClaims.py'); p=policy(direct_alice); c.create_policy('pol_alpha',json.dumps(p),'p')
    c.submit_claim('clm_beta','pol_alpha',json.dumps({"policy_id":"pol_alpha","claimant":str(direct_alice).lower(),"validator":"validator-1","documented_loss":100,"incident_at_ts":2}),'e0')
    e={"kind":"PROTOCOL_FACT","source":"claimant","reference":"fake","commitment":"e1","finality":"FINAL"}; c.append_evidence('clm_beta',json.dumps(e),'e1')
    assert len(json.loads(c.get_evidence('clm_beta')))==1
    assert json.loads(c.get_claim('clm_beta'))['state']=='AWAITING_FINALITY'
    with direct_vm.expect_revert('adapter unavailable'): c.record_protocol_finality('clm_beta',json.dumps(e))
