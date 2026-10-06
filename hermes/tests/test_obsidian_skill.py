"""Skill „obsidian” Jarvisa (hermes/skills/note-taking/obsidian/SKILL.md) — mechanika sejfu, bez powielania polityki z _CLAUDE.md.

Sprawdza: frontmatter, odsyłacz do _CLAUDE.md przed zapisem, szablony wpisów, brak sekretów, rozmiar,
oraz że apply_profile.copy_repo_skills kopiuje skill do profilu i ~/.hermes/skills (idempotentnie).
"""
from __future__ import annotations

import importlib.util
import os
import re
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit
HERMES = Path(__file__).resolve().parent.parent
SKILL = HERMES / "skills" / "note-taking" / "obsidian" / "SKILL.md"
VAULT = Path(os.environ.get("OBSIDIAN_VAULT_PATH") or Path.home() / "Documents" / "hermes")


@pytest.fixture(scope="module")
def text() -> str:
    return SKILL.read_text(encoding="utf-8")


def test_frontmatter(text):
    head = text.split("---")[1]
    assert re.search(r"^name:\s*obsidian\s*$", head, re.M)
    assert re.search(r"^version:\s*\d+\.\d+\.\d+", head, re.M)
    assert "platforms:" in head and "description:" in head


def test_vault_path_and_policy_pointer(text):
    assert r"C:\Users\majke\Documents\hermes" in text
    assert "_CLAUDE.md" in text and "nie jest wczytywany automatycznie" in text
    assert re.search(r"przed każdym zapisem.*przeczytaj", text, re.I | re.S)
    # mechanika nie powiela polityki: żadnej własnej listy typów logu ani zasad anty-fabrykacji
    assert "Słownik TYP-ów" not in text and "Anti-fabrication" not in text


def test_entry_templates_present(text):
    assert "| RRRR-MM-DD GG:MM | TYP | [Jarvis]" in text
    assert "**RRRR-MM-DD — [Jarvis]" in text
    assert "## 3. 💼 Sesje AI tego dnia" in text and "## 5. 💡 Notatki i obserwacje" in text
    assert "## Dla przyszłego Jarvisa" in text and "ai-first: true" in text
    assert "source: hermes" in text


def test_pipeline_and_assertions(text):
    assert "## 5. Pipeline" in text and "## 6. Asercje" in text
    assert "z zegara" in text
    assert "na końcu" in text.split("## 6.")[1].lower() or "na końcu" in text
    assert "Set-Content" in text and "`echo >>`" in text        # pułapki kodowania/sklejania wierszy


def test_no_secrets_and_size(text):
    assert not re.search(r"(sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}|[0-9]{8,}:[A-Za-z0-9_-]{30,})", text)
    assert len(text.encode("utf-8")) <= 12_000, "skill ma być zwięzły — procedury szczegółowe do references/, polityka do _CLAUDE.md"


@pytest.mark.skipif(not (VAULT / "_CLAUDE.md").is_file(), reason="brak sejfu na tej maszynie (CI)")
def test_policy_has_type_dictionary_skill_points_to():
    pol = (VAULT / "_CLAUDE.md").read_text(encoding="utf-8")
    assert "Słownik TYP-ów" in pol
    for t in ("SESSION", "CREATE", "UPDATE", "FIX", "DEPLOY", "DAILY-CONTEXT"):
        assert f"`{t}`" in pol


def _apply_profile():
    spec = importlib.util.spec_from_file_location("apply_profile_under_test", HERMES / "apply_profile.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_copy_repo_skills_to_profile_and_global(tmp_path):
    ap = _apply_profile()
    assert "note-taking/obsidian" in ap.REPO_SKILLS
    home, pdir = tmp_path / "home", tmp_path / "home" / "profiles" / "jarvis-desktop"
    pdir.mkdir(parents=True)
    written = ap.copy_repo_skills(pdir, home)
    for root in (pdir / "skills", home / "skills"):
        cp = root / "note-taking" / "obsidian" / "SKILL.md"
        assert cp.is_file() and cp.read_bytes() == SKILL.read_bytes()
    assert len(written) >= 2
    # idempotentnie i nadpisuje zmianę zrobioną w kopii (skill_manage)
    (pdir / "skills" / "note-taking" / "obsidian" / "SKILL.md").write_text("zepsute", encoding="utf-8")
    ap.copy_repo_skills(pdir, home)
    assert (pdir / "skills" / "note-taking" / "obsidian" / "SKILL.md").read_bytes() == SKILL.read_bytes()
