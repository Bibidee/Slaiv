import json
import pytest

from test_slaiv_claims import (
    VALIDATOR, EVENT_ID, EVENT_URL, address, policy, evidence,
    verified_protocol_result, mock_finality, create_claim,
)


def protocol_id(event_id=EVENT_ID):
    return "protocol-" + event_id[2:].lower()


def verdict(claim_id="clm_beta", policy_id="pol_alpha", **changes):
    value = {
        "eligibility": "PARTIALLY_APPROVED",
        "incident_class": "MISSED_EXECUTION_WINDOW",
        "claim_id": claim_id,
        "policy_id": policy_id,
        "validator": VALIDATOR,
        "slash_final": True,
        "covered_event": True,
        "exclusion_triggered": False,
        "eligible_loss": 80,
        "confidence": 1,
        "supported_evidence_ids": [protocol_id()],
        "reasoning_summary": "Deterministic policy and verified protocol fact support the result.",
    }
    value.update(changes)
    return value


def promote(direct_vm, contract, sender, claim_id="clm_beta", event_id=EVENT_ID, event_url=EVENT_URL, result=None):
    mock_finality(direct_vm, result or verified_protocol_result(event_id))
    direct_vm.sender = sender
    contract.verify_protocol_finality(claim_id, event_id, event_url)
    direct_vm.clear_mocks()


def review(direct_vm, contract, sender, result=None, claim_id="clm_beta"):
    direct_vm.mock_llm(r".*Apply policy literally.*", json.dumps(result or verdict(claim_id=claim_id)))
    direct_vm.sender = sender
    contract.review_slashing_claim(claim_id)
    direct_vm.clear_mocks()


@pytest.mark.parametrize("changes,error", [
    ({"holder": "0x0000000000000000000000000000000000000001"}, "holder mismatch"),
    ({"subject_network": "mainnet"}, "invalid policy subject"),
    ({"validator": "not-an-address"}, "invalid policy subject"),
    ({"coverage_start_ts": 9999999999}, "invalid coverage dates"),
    ({"coverage_limit": 0}, "invalid coverage limit"),
    ({"deductible_bps": 10001}, "invalid deductible"),
    ({"covered_events": []}, "invalid covered events"),
])
def test_policy_terms_remain_deterministically_bounded(direct_vm, direct_deploy, direct_alice, changes, error):
    direct_vm.sender = direct_alice
    c = direct_deploy("contracts/SlaivClaims.py")
    item = policy(direct_alice); item.update(changes)
    with direct_vm.expect_revert(error):
        c.create_policy("pol_alpha", item, "p")


def test_claim_identity_cannot_be_impersonated(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    c = direct_deploy("contracts/SlaivClaims.py")
    c.create_policy("pol_alpha", policy(direct_alice), "p")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("unauthorized claimant"):
        c.submit_claim("clm_beta", "pol_alpha", {"policy_id":"pol_alpha","claimant":address(direct_bob),"validator":VALIDATOR,"documented_loss":100,"incident_at_ts":2}, "e0")


def test_public_source_evidence_is_permissionless_but_claimant_assertion_is_not(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    claimant = evidence("clm_beta", "claimant-1")
    public = evidence("clm_beta", "public-1", "PUBLIC_SOURCE")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("unauthorized evidence"):
        c.append_evidence("clm_beta", claimant, claimant["content_hash"])
    c.append_evidence("clm_beta", public, public["content_hash"])
    assert json.loads(c.get_evidence("clm_beta"))[0]["submitted_by"] == address(direct_bob)


@pytest.mark.parametrize("event_id,url", [
    ("evt-not-a-hash", EVENT_URL),
    (EVENT_ID, "https://example.com/tx/" + EVENT_ID),
    (EVENT_ID, "https://explorer-studio.genlayer.com/tx/0x" + "cd" * 32),
])
def test_finality_candidate_must_be_an_official_matching_event_reference(direct_vm, direct_deploy, direct_alice, direct_bob, event_id, url):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("invalid protocol candidate"):
        c.verify_protocol_finality("clm_beta", event_id, url)


@pytest.mark.parametrize("changes", [
    {"verified": False},
    {"event_final": False},
    {"validator": "0x2222222222222222222222222222222222222222"},
    {"network": "testnetAsimov"},
    {"event_id": "0x" + "cd" * 32},
    {"event_at_ts": 10000000000},
])
def test_consensus_verified_finality_fails_closed_on_mismatch(direct_vm, direct_deploy, direct_alice, direct_bob, changes):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    result = verified_protocol_result(**changes)
    mock_finality(direct_vm, result)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("protocol finality not verified"):
        c.verify_protocol_finality("clm_beta", EVENT_ID, EVENT_URL)
    assert json.loads(c.get_claim("clm_beta"))["state"] == "AWAITING_FINALITY"


def test_protocol_validator_independently_refetches_and_can_disagree(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    mock_finality(direct_vm)
    direct_vm.sender = direct_bob
    c.verify_protocol_finality("clm_beta", EVENT_ID, EVENT_URL)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"explorer-studio\.genlayer\.com/tx/.*", {"status":200,"body":"different official record","method":"GET"})
    direct_vm.mock_llm(r".*Independently determine whether it explicitly proves a FINAL GenLayer protocol event.*", json.dumps(verified_protocol_result(validator="0x2222222222222222222222222222222222222222")))
    assert direct_vm.run_validator() is False


def test_protocol_event_replay_is_scoped_per_policy(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    """A genuine slash event may support independent claims on separate
    policies (e.g. two policyholders insured against the same validator),
    but a single policy cannot reuse the same event across two of its own
    claims."""
    direct_vm.sender = direct_alice
    c = direct_deploy("contracts/SlaivClaims.py")
    c.create_policy("pol_a", policy(direct_alice, "pol_a"), "p")
    c.create_policy("pol_b", policy(direct_alice, "pol_b"), "p")
    for cid, pid in (("clm_a", "pol_a"), ("clm_b", "pol_b")):
        c.submit_claim(cid, pid, {"policy_id": pid, "claimant": address(direct_alice), "validator": VALIDATOR, "documented_loss": 100, "incident_at_ts": 2}, "e")

    # Different policies covering the same validator/event: both may settle.
    promote(direct_vm, c, direct_bob, "clm_a")
    promote(direct_vm, c, direct_charlie, "clm_b")
    assert json.loads(c.get_claim("clm_a"))["underlying_finality"] == "FINAL"
    assert json.loads(c.get_claim("clm_b"))["underlying_finality"] == "FINAL"

    # A second claim under the SAME policy cannot reuse the same event.
    direct_vm.sender = direct_alice
    c.submit_claim("clm_a2", "pol_a", {"policy_id": "pol_a", "claimant": address(direct_alice), "validator": VALIDATOR, "documented_loss": 100, "incident_at_ts": 2}, "e")
    mock_finality(direct_vm)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("protocol event already used for this policy"):
        c.verify_protocol_finality("clm_a2", EVENT_ID, EVENT_URL)


def test_genlayer_judgment_is_permissionless_and_invalid_consensus_cannot_settle(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm,c,direct_bob)
    bad = verdict(eligible_loss=101)
    direct_vm.mock_llm(r".*Apply policy literally.*",json.dumps(bad))
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("invalid verdict"):
        c.review_slashing_claim("clm_beta")
    direct_vm.clear_mocks()
    review(direct_vm,c,direct_charlie)
    assert json.loads(c.get_claim("clm_beta"))["state"] == "PARTIALLY_APPROVED"


def test_judgment_validator_disagreement_is_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm,c,direct_bob)
    direct_vm.mock_llm(r".*Apply policy literally.*",json.dumps(verdict()))
    c.review_slashing_claim("clm_beta")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*Apply policy literally.*",json.dumps(verdict(eligibility="DENIED",eligible_loss=0,exclusion_triggered=True)))
    assert direct_vm.run_validator() is False


def test_appeal_creation_is_claimant_right_but_review_is_permissionless(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm,c,direct_bob)
    review(direct_vm,c,direct_charlie)
    item=evidence("clm_beta","appeal-1")
    direct_vm.sender=direct_bob
    with direct_vm.expect_revert("invalid appeal"):
        c.record_appeal("clm_beta","Material evidence changes the loss analysis.",item)
    direct_vm.sender=direct_alice
    c.record_appeal("clm_beta","Material evidence changes the loss analysis.",item)
    upheld={"disposition":"UPHOLD"}
    direct_vm.mock_llm(r".*Return JSON only with disposition.*",json.dumps(upheld))
    direct_vm.sender=direct_charlie
    c.review_appeal("clm_beta")
    assert json.loads(c.get_claim("clm_beta"))["appeal_resolved"] is True


def test_approved_claim_can_be_finalized_by_any_wallet(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm,c,direct_bob)
    review(direct_vm,c,direct_charlie,verdict(eligibility="APPROVED",eligible_loss=100))
    direct_vm.sender=direct_bob
    c.finalize_claim("clm_beta")
    assert c.get_payout("clm_beta") == 95
    assert json.loads(c.get_claim("clm_beta"))["finalized_by"] == address(direct_bob)


def test_third_party_cannot_front_run_claimant_appeal_window(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    direct_vm.warp("2026-08-20T08:00:00Z")
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm,c,direct_bob)
    review(direct_vm,c,direct_charlie,verdict(eligibility="DENIED",eligible_loss=0,exclusion_triggered=True))
    direct_vm.sender=direct_bob
    with direct_vm.expect_revert("cannot finalize"):
        c.finalize_claim("clm_beta")
    direct_vm.warp("2026-08-20T10:00:00Z")
    c.finalize_claim("clm_beta")
    assert c.get_payout("clm_beta") == 0


def test_claimant_may_waive_appeal_by_finalizing_own_denial(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm,c,direct_bob)
    review(direct_vm,c,direct_bob,verdict(eligibility="DENIED",eligible_loss=0,exclusion_triggered=True))
    direct_vm.sender=direct_alice
    c.finalize_claim("clm_beta")
    assert json.loads(c.get_claim("clm_beta"))["state"] == "FINAL"


def test_claim_incident_outside_coverage_window_is_rejected(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    c = direct_deploy("contracts/SlaivClaims.py")
    c.create_policy("pol_alpha", policy(direct_alice), "p")
    with direct_vm.expect_revert("incident outside coverage"):
        c.submit_claim("clm_late", "pol_alpha", {"policy_id": "pol_alpha", "claimant": address(direct_alice), "validator": VALIDATOR, "documented_loss": 100, "incident_at_ts": 99999999999}, "e")


def test_unresolved_verdict_is_never_finalizable(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm, c, direct_bob)
    review(direct_vm, c, direct_charlie, verdict(eligibility="UNRESOLVED", eligible_loss=0, covered_event=True, slash_final=False))
    assert json.loads(c.get_claim("clm_beta"))["state"] == "UNRESOLVED"
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("cannot finalize"):
        c.finalize_claim("clm_beta")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("cannot finalize"):
        c.finalize_claim("clm_beta")


def test_claim_cannot_be_finalized_twice(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm, c, direct_bob)
    review(direct_vm, c, direct_charlie, verdict(eligibility="APPROVED", eligible_loss=100))
    direct_vm.sender = direct_bob
    c.finalize_claim("clm_beta")
    with direct_vm.expect_revert("cannot finalize"):
        c.finalize_claim("clm_beta")


def test_outsider_may_finalize_immediately_once_appeal_is_resolved(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    direct_vm.warp("2026-08-20T08:00:00Z")
    c = create_claim(direct_vm, direct_deploy, direct_alice)
    promote(direct_vm, c, direct_bob)
    review(direct_vm, c, direct_charlie, verdict(eligibility="DENIED", eligible_loss=0, exclusion_triggered=True))
    item = evidence("clm_beta", "appeal-1")
    direct_vm.sender = direct_alice
    c.record_appeal("clm_beta", "Material evidence changes the loss analysis.", item)
    direct_vm.mock_llm(r".*Return JSON only with disposition.*", json.dumps({"disposition": "UPHOLD"}))
    direct_vm.sender = direct_charlie
    c.review_appeal("clm_beta")
    # No time warp: still well inside the original appeal window, but the
    # appeal is already resolved, so an outsider need not wait.
    c.finalize_claim("clm_beta")
    assert json.loads(c.get_claim("clm_beta"))["finalized_by"] == address(direct_charlie)


def test_protocol_stats_advertise_permissionless_mode(direct_vm,direct_deploy,direct_alice):
    direct_vm.sender=direct_alice
    c=direct_deploy("contracts/SlaivClaims.py")
    stats=json.loads(c.get_protocol_stats())
    assert stats["permissionless"] is True
    assert stats["appeal_window_seconds"] == 3600
