import json

import pytest

from test_slaiv_claims import contract_address


def address(account):
    return "0x" + bytes(account).hex()


def policy(owner, policy_id="pol_alpha", **changes):
    value = {
        "policy_id": policy_id, "holder": address(owner), "protocol": "genlayer",
        "validator": "validator-1", "coverage_start_ts": 10,
        "coverage_end_ts": 1000, "coverage_limit": 500,
        "covered_events": ["MISSED_EXECUTION_WINDOW"], "exclusions": [],
        "deductible_bps": 500,
        "payout_rule": "min(eligible_loss_after_deductible, coverage_limit)",
    }
    value.update(changes)
    return value


def claim(owner, policy_id="pol_alpha", **changes):
    value = {"policy_id": policy_id, "claimant": address(owner), "validator": "validator-1", "documented_loss": 100, "incident_at_ts": 20}
    value.update(changes)
    return value


def evidence(claim_id, evidence_id, kind="CLAIMANT_ASSERTION", **changes):
    value = {"claim_id": claim_id, "evidence_id": evidence_id, "kind": kind,
             "source": "test source", "reference": "https://evidence.example/" + evidence_id,
             "content_hash": "a" * 64, "submitted_at": 20}
    value.update(changes)
    return value


def protocol(claim_id, event_id="evt-1", **changes):
    value = evidence(claim_id, "protocol-" + event_id, "PROTOCOL_FACT")
    value.update({"protocol": "genlayer", "validator": "validator-1",
                  "source": "GENLAYER_STAKING_ADAPTER", "network": "studionet",
                  "event_id": event_id, "finality": "FINAL"})
    value.update(changes)
    return value


def deploy_policy(direct_vm, direct_deploy, direct_alice, policy_id="pol_alpha", **changes):
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/SlaivClaims.py")
    contract.create_policy(policy_id, policy(direct_alice, policy_id, **changes), "policy-commitment")
    return contract


def submit(direct_vm, contract, owner, claim_id="clm_alpha", policy_id="pol_alpha", **changes):
    direct_vm.sender = owner
    contract.submit_claim(claim_id, policy_id, claim(owner, policy_id, **changes), "claim-commitment")


def promote(direct_vm, contract, owner, claim_id="clm_alpha", event_id="evt-1"):
    direct_vm.sender = owner
    contract.record_protocol_finality(claim_id, protocol(claim_id, event_id))


def verdict(claim_id="clm_alpha", policy_id="pol_alpha", **changes):
    value = {"eligibility": "PARTIALLY_APPROVED", "incident_class": "MISSED_EXECUTION_WINDOW",
             "claim_id": claim_id, "policy_id": policy_id, "validator": "validator-1",
             "slash_final": True, "covered_event": True, "exclusion_triggered": False,
             "eligible_loss": 80, "confidence": 1, "supported_evidence_ids": ["protocol-evt-1"],
             "reasoning_summary": "Deterministic policy and finality checks pass."}
    value.update(changes)
    return value


@pytest.mark.parametrize("changes,error", [
    ({"holder": "0x0000000000000000000000000000000000000001"}, "holder mismatch"),
    ({"validator": ""}, "invalid policy subject"),
    ({"coverage_start_ts": 1000}, "invalid coverage dates"),
    ({"coverage_limit": 0}, "invalid coverage limit"),
    ({"deductible_bps": -1}, "invalid deductible"),
    ({"deductible_bps": 10001}, "invalid deductible"),
    ({"covered_events": []}, "invalid covered events"),
    ({"covered_events": ["NOT_SUPPORTED"]}, "invalid covered events"),
    ({"covered_events": ["MISSED_EXECUTION_WINDOW", "MISSED_EXECUTION_WINDOW"]}, "invalid covered events"),
    ({"policy_id": "x"}, "invalid policy id"),
])
def test_policy_rejects_invalid_terms(direct_vm, direct_deploy, direct_alice, changes, error):
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/SlaivClaims.py")
    with direct_vm.expect_revert(error):
        item = policy(direct_alice, "pol_alpha"); item.update(changes)
        contract.create_policy("pol_alpha", item, "p")


def test_policy_duplicate_and_bounded_enumeration(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("duplicate policy"):
        contract.create_policy("pol_alpha", policy(direct_alice), "p")
    contract.create_policy("pol_beta", policy(direct_alice, "pol_beta"), "p")
    assert json.loads(contract.list_policy_ids(0, 1)) == ["pol_alpha"]
    assert json.loads(contract.list_policy_ids(1, 1)) == ["pol_beta"]
    with direct_vm.expect_revert("invalid page"):
        contract.list_policy_ids(0, 51)


@pytest.mark.parametrize("changes,error", [
    ({"claimant": "0x0000000000000000000000000000000000000001"}, "unauthorized claimant"),
    ({"validator": "validator-2"}, "policy mismatch"),
    ({"policy_id": "other"}, "policy mismatch"),
    ({"incident_at_ts": 9}, "incident outside coverage"),
    ({"incident_at_ts": 1001}, "incident outside coverage"),
    ({"documented_loss": 0}, "invalid claim"),
    ({"documented_loss": "100"}, "invalid claim"),
])
def test_claim_rejects_invalid_binding_and_terms(direct_vm, direct_deploy, direct_alice, changes, error):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert(error):
        if "policy_id" in changes:
            item = claim(direct_alice); item.update(changes)
            direct_vm.sender = direct_alice
            contract.submit_claim("clm_alpha", "pol_alpha", item, "claim-commitment")
        else:
            submit(direct_vm, contract, direct_alice, **changes)


def test_claim_is_awaiting_finality_and_enumerable(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice, underlying_finality="FINAL")
    submit(direct_vm, contract, direct_alice, "clm_beta")
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "AWAITING_FINALITY"
    assert json.loads(contract.list_claim_ids(0, 50)) == ["clm_alpha", "clm_beta"]
    assert json.loads(contract.list_policy_claim_ids("pol_alpha", 0, 50)) == ["clm_alpha", "clm_beta"]
    with direct_vm.expect_revert("duplicate claim"):
        submit(direct_vm, contract, direct_alice)


def test_claim_wrong_sender_and_missing_policy_are_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("unauthorized claimant"):
        contract.submit_claim("clm_alpha", "pol_alpha", claim(direct_bob), "c")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("unknown record"):
        contract.submit_claim("clm_alpha", "missing", claim(direct_alice, "missing"), "c")


@pytest.mark.parametrize("changes,error", [
    ({"content_hash": "A" * 64}, "invalid evidence hash"),
    ({"evidence_id": "x"}, "invalid evidence id"),
    ({"source": ""}, "invalid evidence source"),
    ({"reference": ""}, "invalid evidence reference"),
    ({"submitted_at": 0}, "invalid evidence timestamp"),
])
def test_claimant_evidence_schema_is_bounded(direct_vm, direct_deploy, direct_alice, changes, error):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_alice
    item = evidence("clm_alpha", "claimant-1"); item.update(changes)
    with direct_vm.expect_revert(error):
        contract.append_evidence("clm_alpha", item, item["content_hash"])


def test_evidence_binding_authorization_duplication_and_closure(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice)
    item = evidence("clm_alpha", "claimant-1")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("unauthorized evidence"):
        contract.append_evidence("clm_alpha", item, item["content_hash"])
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid evidence"):
        contract.append_evidence("clm_alpha", evidence("other", "claimant-1"), "a" * 64)
    contract.append_evidence("clm_alpha", item, item["content_hash"])
    with direct_vm.expect_revert("duplicate evidence id"):
        contract.append_evidence("clm_alpha", item, item["content_hash"])
    promote(direct_vm, contract, direct_alice)
    with direct_vm.expect_revert("evidence closed"):
        contract.append_evidence("clm_alpha", evidence("clm_alpha", "late"), "a" * 64)


@pytest.mark.parametrize("changes,error", [
    ({"finality": "PENDING"}, "invalid protocol evidence"),
    ({"reference": "http://insecure.example/event"}, "invalid protocol evidence"),
    ({"content_hash": "bad"}, "invalid protocol evidence"),
    ({"validator": "fake-validator"}, "invalid protocol evidence"),
    ({"network": "unknown"}, "invalid protocol evidence"),
])
def test_protocol_finality_fails_closed_for_invalid_records(direct_vm, direct_deploy, direct_alice, changes, error):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert(error):
        contract.record_protocol_finality("clm_alpha", protocol("clm_alpha", **changes))
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "AWAITING_FINALITY"


def test_protocol_finality_requires_authority_and_event_is_single_use(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice)
    submit(direct_vm, contract, direct_alice, "clm_beta")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("protocol authority required"):
        contract.record_protocol_finality("clm_alpha", protocol("clm_alpha"))
    direct_vm.sender = direct_alice
    contract.record_protocol_finality("clm_alpha", protocol("clm_alpha", "shared"))
    with direct_vm.expect_revert("protocol event already used"):
        contract.record_protocol_finality("clm_beta", protocol("clm_beta", "shared"))
    with direct_vm.expect_revert("finality already recorded"):
        contract.record_protocol_finality("clm_alpha", protocol("clm_alpha", "different"))


@pytest.mark.parametrize("changes", [
    {"eligibility": "APPROVED", "eligible_loss": -1},
    {"eligibility": "APPROVED", "eligible_loss": 101},
    {"claim_id": "wrong"}, {"policy_id": "wrong"}, {"validator": "wrong"},
    {"supported_evidence_ids": ["unknown"]},
    {"incident_class": "MISSED_APPEAL_WINDOW"},
    {"slash_final": False}, {"exclusion_triggered": True},
])
def test_review_rejects_invalid_or_uncovered_consensus(direct_vm, direct_deploy, direct_alice, changes):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(verdict(**changes)))
    with direct_vm.expect_revert("invalid verdict"):
        contract.review_slashing_claim("clm_alpha")


def test_review_denied_and_consensus_disagreement(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    denied = verdict(eligibility="DENIED", eligible_loss=0, slash_final=False, covered_event=True, exclusion_triggered=True)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(denied))
    contract.review_slashing_claim("clm_alpha")
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "DENIED"
    contract.finalize_claim("clm_alpha")
    assert contract.get_payout("clm_alpha") == 0

    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(verdict()))
    assert direct_vm.run_validator() is False


def test_uncovered_event_is_truthfully_classified_and_denied(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    denied = verdict(eligibility="DENIED", incident_class="MISSED_APPEAL_WINDOW", covered_event=False, eligible_loss=0)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(denied))
    contract.review_slashing_claim("clm_alpha")
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "DENIED"
    contract.finalize_claim("clm_alpha")
    assert contract.get_payout("clm_alpha") == 0


@pytest.mark.parametrize("eligibility", ["APPROVED", "PARTIALLY_APPROVED"])
def test_uncovered_event_cannot_approve(direct_vm, direct_deploy, direct_alice, eligibility):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    invalid = verdict(eligibility=eligibility, incident_class="MISSED_APPEAL_WINDOW", covered_event=False)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(invalid))
    with direct_vm.expect_revert("invalid verdict"):
        contract.review_slashing_claim("clm_alpha")


def test_appeal_cannot_overturn_uncovered_event_into_approval(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    denied = verdict(eligibility="DENIED", incident_class="MISSED_APPEAL_WINDOW", covered_event=False, eligible_loss=0)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(denied)); contract.review_slashing_claim("clm_alpha")
    contract.record_appeal("clm_alpha", "Material evidence requests review of the event classification.", evidence("clm_alpha", "appeal-uncovered"))
    replacement = verdict(eligibility="APPROVED", incident_class="MISSED_APPEAL_WINDOW", covered_event=False, supported_evidence_ids=["protocol-evt-1", "appeal-uncovered"])
    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Return JSON only with disposition.*", json.dumps({"disposition":"OVERTURN","verdict":replacement}))
    with direct_vm.expect_revert("invalid appeal verdict"):
        contract.review_appeal("clm_alpha")


def test_finalize_applies_deductible_cap_and_terminal_state(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice, coverage_limit=70)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(verdict()))
    contract.review_slashing_claim("clm_alpha")
    contract.finalize_claim("clm_alpha")
    assert contract.get_payout("clm_alpha") == 70
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "FINAL"
    with direct_vm.expect_revert("cannot finalize"):
        contract.finalize_claim("clm_alpha")


def test_finalize_rejects_wrong_state_and_wrong_caller(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice)
    with direct_vm.expect_revert("cannot finalize"):
        contract.finalize_claim("clm_alpha")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("cannot finalize"):
        contract.finalize_claim("clm_alpha")


def prepare_appeal(direct_vm, direct_deploy, direct_alice):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice); promote(direct_vm, contract, direct_alice)
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(verdict()))
    contract.review_slashing_claim("clm_alpha")
    return contract


@pytest.mark.parametrize("ground,item,error", [
    ("short", None, "invalid appeal"),
    ("x" * 2001, None, "invalid appeal"),
    ("Material evidence changes the documented loss assessment.", {"claim_id": "clm_alpha"}, "invalid evidence"),
])
def test_appeal_requires_permitted_state_ground_and_structured_evidence(direct_vm, direct_deploy, direct_alice, ground, item, error):
    contract = prepare_appeal(direct_vm, direct_deploy, direct_alice)
    item = evidence("clm_alpha", "appeal-1") if item is None else item
    with direct_vm.expect_revert(error):
        contract.record_appeal("clm_alpha", ground, item)


def test_appeal_wrong_caller_duplicate_and_valid_uphold(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = prepare_appeal(direct_vm, direct_deploy, direct_alice)
    item = evidence("clm_alpha", "appeal-1")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("invalid appeal"):
        contract.record_appeal("clm_alpha", "Material evidence changes the documented loss assessment.", item)
    direct_vm.sender = direct_alice
    contract.record_appeal("clm_alpha", "Material evidence changes the documented loss assessment.", item)
    with direct_vm.expect_revert("invalid appeal"):
        contract.record_appeal("clm_alpha", "Material evidence changes the documented loss assessment.", evidence("clm_alpha", "appeal-2"))
    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Return JSON only with disposition.*", json.dumps({"disposition": "UPHOLD"}))
    contract.review_appeal("clm_alpha")
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "PARTIALLY_APPROVED"


@pytest.mark.parametrize("disposition,changed", [("MODIFY", 60), ("OVERTURN", 100)])
def test_appeal_complete_replacement_verdicts_are_enforced(direct_vm, direct_deploy, direct_alice, disposition, changed):
    contract = prepare_appeal(direct_vm, direct_deploy, direct_alice)
    contract.record_appeal("clm_alpha", "Material evidence changes the documented loss assessment.", evidence("clm_alpha", "appeal-1"))
    replacement = verdict(eligibility="APPROVED" if changed == 100 else "PARTIALLY_APPROVED", eligible_loss=changed, supported_evidence_ids=["protocol-evt-1", "appeal-1"])
    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Return JSON only with disposition.*", json.dumps({"disposition": disposition, "verdict": replacement}))
    contract.review_appeal("clm_alpha")
    assert json.loads(contract.get_effective_review("clm_alpha"))["eligible_loss"] == changed


def test_appeal_unresolved_and_disagreement_fail_consensus(direct_vm, direct_deploy, direct_alice):
    contract = prepare_appeal(direct_vm, direct_deploy, direct_alice)
    contract.record_appeal("clm_alpha", "Material evidence changes the documented loss assessment.", evidence("clm_alpha", "appeal-1"))
    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Return JSON only with disposition.*", json.dumps({"disposition": "UNRESOLVED"}))
    contract.review_appeal("clm_alpha")
    assert json.loads(contract.get_claim("clm_alpha"))["state"] == "UNRESOLVED"
    # Captured validator sees a different settlement-critical disposition.
    direct_vm.clear_mocks(); direct_vm.mock_llm(r".*Return JSON only with disposition.*", json.dumps({"disposition": "UPHOLD"}))
    assert direct_vm.run_validator() is False


def test_authority_rotation_restricts_old_authority(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = deploy_policy(direct_vm, direct_deploy, direct_alice)
    submit(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("invalid authority proposal"):
        contract.propose_protocol_authority(contract_address(direct_bob))
    direct_vm.sender = direct_alice
    contract.propose_protocol_authority(contract_address(direct_bob))
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("pending authority required"):
        contract.accept_protocol_authority()
    direct_vm.sender = direct_bob
    contract.accept_protocol_authority()
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("protocol authority required"):
        contract.record_protocol_finality("clm_alpha", protocol("clm_alpha"))
    direct_vm.sender = direct_bob
    contract.record_protocol_finality("clm_alpha", protocol("clm_alpha"))
