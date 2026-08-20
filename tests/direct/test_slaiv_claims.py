import json

VALIDATOR = "0x1111111111111111111111111111111111111111"
EVENT_ID = "0x" + "ab" * 32
RPC_URL = "https://studio.genlayer.com/api"


def address(account):
    return "0x" + bytes(account).hex()


def policy(owner, policy_id="pol_alpha"):
    return {
        "policy_id": policy_id,
        "holder": address(owner),
        "protocol": "genlayer",
        "subject_network": "studionet",
        "validator": VALIDATOR,
        "coverage_start_ts": 1,
        "coverage_end_ts": 9999999999,
        "coverage_limit": 500,
        "covered_events": ["MISSED_EXECUTION_WINDOW"],
        "exclusions": [],
        "deductible_bps": 500,
        "payout_rule": "min(eligible_loss_after_deductible, coverage_limit)",
    }


def evidence(claim_id, evidence_id, kind="CLAIMANT_ASSERTION"):
    return {
        "claim_id": claim_id,
        "evidence_id": evidence_id,
        "kind": kind,
        "source": "test source",
        "reference": "https://evidence.example/" + evidence_id,
        "content_hash": "a" * 64,
        "submitted_at": 2,
    }


def rpc_tx(event_id=EVENT_ID, **changes):
    """A transaction shaped like the real eth_getTransactionByHash response
    observed against https://studio.genlayer.com/api, carrying a genuine
    MISSED_EXECUTION_WINDOW signal for VALIDATOR (leader_timeout_validators
    contains it)."""
    tx = {
        "hash": event_id,
        "status": "FINALIZED",
        "leader_timeout_validators": [VALIDATOR],
        "appeal_leader_timeout": False,
        "appeal_validators_timeout": False,
        "appeal_failed": 0,
        "rotation_count": 0,
        "timestamp_awaiting_finalization": 2,
    }
    tx.update(changes)
    return tx


def mock_rpc_response(direct_vm, body_json):
    direct_vm.mock_web(
        r"studio\.genlayer\.com/api",
        {"status": 200, "body": json.dumps(body_json), "method": "POST"},
    )


def mock_finality(direct_vm, tx=None):
    mock_rpc_response(direct_vm, {"jsonrpc": "2.0", "result": tx if tx is not None else rpc_tx(), "id": 1})


def create_claim(direct_vm, direct_deploy, owner, claim_id="clm_beta", policy_id="pol_alpha"):
    direct_vm.sender = owner
    contract = direct_deploy("contracts/SlaivClaims.py")
    contract.create_policy(policy_id, policy(owner, policy_id), "p")
    contract.submit_claim(
        claim_id,
        policy_id,
        {"policy_id": policy_id, "claimant": address(owner), "validator": VALIDATOR, "documented_loss": 100, "incident_at_ts": 2},
        "e0",
    )
    return contract


def test_policy_claim_and_claimant_evidence_are_contract_state(direct_vm, direct_deploy, direct_alice):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    e = evidence("clm_beta", "evd_claimant")
    c.append_evidence("clm_beta", e, e["content_hash"])
    stored = json.loads(c.get_evidence("clm_beta"))
    assert stored[0]["kind"] == "CLAIMANT_ASSERTION"
    assert json.loads(c.get_claim("clm_beta"))["state"] == "AWAITING_FINALITY"


def test_any_wallet_can_trigger_consensus_verified_protocol_finality(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    mock_finality(direct_vm)
    direct_vm.sender = direct_bob
    c.verify_protocol_finality("clm_beta", EVENT_ID)
    claim = json.loads(c.get_claim("clm_beta"))
    facts = json.loads(c.get_evidence("clm_beta"))
    assert claim["state"] == "UNDER_REVIEW"
    assert claim["underlying_finality"] == "FINAL"
    assert facts[-1]["kind"] == "PROTOCOL_FACT"
    assert facts[-1]["verified_by"] == "GENLAYER_CONSENSUS"
    assert facts[-1]["submitted_by"] == address(direct_bob)


def test_caller_cannot_choose_protocol_outcome(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    mock_finality(direct_vm, rpc_tx(status="PENDING", leader_timeout_validators=[]))
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("protocol finality not verified"):
        c.verify_protocol_finality("clm_beta", EVENT_ID)
    assert json.loads(c.get_claim("clm_beta"))["state"] == "AWAITING_FINALITY"


def test_full_permissionless_review_and_finalization_lifecycle(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = create_claim(direct_vm, direct_deploy, direct_alice, "clm_full", "pol_full")
    claimant = evidence("clm_full", "evd_full")
    c.append_evidence("clm_full", claimant, claimant["content_hash"])
    mock_finality(direct_vm)
    direct_vm.sender = direct_bob
    c.verify_protocol_finality("clm_full", EVENT_ID)
    protocol_id = "protocol-" + EVENT_ID[2:]
    verdict = {
        "eligibility": "APPROVED",
        "incident_class": "MISSED_EXECUTION_WINDOW",
        "claim_id": "clm_full",
        "policy_id": "pol_full",
        "validator": VALIDATOR,
        "slash_final": True,
        "covered_event": True,
        "exclusion_triggered": False,
        "eligible_loss": 100,
        "confidence": 1,
        "supported_evidence_ids": ["evd_full", protocol_id],
        "reasoning_summary": "Consensus applies the deterministic coverage boundary.",
    }
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(verdict))
    direct_vm.sender = direct_charlie
    c.review_slashing_claim("clm_full")
    assert json.loads(c.get_review("clm_full"))["eligibility"] == "APPROVED"
    direct_vm.sender = direct_bob
    c.finalize_claim("clm_full")
    assert json.loads(c.get_claim("clm_full"))["state"] == "FINAL"
    assert c.get_payout("clm_full") == 95


def test_identity_bound_appeal_remains_claimant_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    mock_finality(direct_vm)
    direct_vm.sender = direct_bob
    c.verify_protocol_finality("clm_beta", EVENT_ID)
    protocol_id = "protocol-" + EVENT_ID[2:]
    denied = {
        "eligibility": "DENIED", "incident_class": "MISSED_EXECUTION_WINDOW",
        "claim_id": "clm_beta", "policy_id": "pol_alpha", "validator": VALIDATOR,
        "slash_final": True, "covered_event": True, "exclusion_triggered": True,
        "eligible_loss": 0, "confidence": 1, "supported_evidence_ids": [protocol_id],
        "reasoning_summary": "Policy exclusion applies.",
    }
    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(denied))
    c.review_slashing_claim("clm_beta")
    appeal_evidence = evidence("clm_beta", "evd_appeal")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("invalid appeal"):
        c.record_appeal("clm_beta", "Material evidence changes the exclusion analysis.", appeal_evidence)
    direct_vm.sender = direct_alice
    c.record_appeal("clm_beta", "Material evidence changes the exclusion analysis.", appeal_evidence)
    assert json.loads(c.get_claim("clm_beta"))["state"] == "APPEALED"
