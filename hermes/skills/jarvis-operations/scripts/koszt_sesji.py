#!/usr/bin/env python
"""Koszt sesji Hermesa: per linia i per model + ile zabralby /new.

Uruchomienie (interpreter Hermesa):
  C:/Users/majke/.hermes/hermes-agent/venv/Scripts/python.exe koszt_sesji.py [session_id]

Stawki w PRICE sa kopia snapshotu z hermes-agent/agent/usage_pricing.py —
przy zmianie cennika zaktualizuj obie kopie (patrz references/deepseek-tokeny-i-koszt.md).
"""
import sqlite3
import sys
from pathlib import Path

DB = Path.home() / ".hermes" / "profiles" / "jarvis-desktop" / "state.db"
# stawki za 1 mln tokenow (USD, off-peak); szczyt = 2x
PRICE = {"deepseek-flash": {"in": 0.15, "cache": 0.003, "out": 0.60}}
BACKDROP_LANES = ("compression", "background_review")


def cost(model, fresh_in, cache_read, out):
    p = PRICE.get(model)
    if not p:
        return None
    return (fresh_in * p["in"] + cache_read * p["cache"] + out * p["out"]) / 1e6


def main():
    c = sqlite3.connect(str(DB))
    c.row_factory = sqlite3.Row
    sid = sys.argv[1] if len(sys.argv) > 1 else c.execute(
        "select id from sessions order by last_activity_at desc limit 1").fetchone()[0]
    row = c.execute("select * from sessions where id=?", (sid,)).fetchone()
    print(f"sesja {sid} | model={row['model']} | msgs={row['message_count']} "
          f"| wywolania API={row['api_call_count']} | est=${row['estimated_cost_usd']}")
    cols = [r[1] for r in c.execute("PRAGMA table_info(session_model_usage)")]
    lane = next((k for k in ("lane", "role", "task") if k in cols), None)
    if lane:
        print(f"\n{'linia':<20}{'model':<20}{'swiezy in':>12}{'cache':>12}{'out':>10}{'koszt':>10}")
        work = backdrop = 0.0
        for r in c.execute(f"select * from session_model_usage where session_id=?", (sid,)):
            d = dict(r)
            k = cost(d.get("model"), d.get("input_tokens") or 0,
                     d.get("cache_read_tokens") or 0, d.get("output_tokens") or 0)
            name = str(d.get(lane, "?"))
            print(f"{name:<20}{str(d.get('model')):<20}{d.get('input_tokens') or 0:>12,}"
                  f"{d.get('cache_read_tokens') or 0:>12,}{d.get('output_tokens') or 0:>10,}"
                  f"{('$%.4f' % k) if k is not None else 'brak ceny':>10}")
            if k is not None:
                if any(x in name for x in BACKDROP_LANES):
                    backdrop += k
                else:
                    work += k
        print(f"\nRAZEM praca=${work:.4f} | narzut (compression+background_review)=${backdrop:.4f}"
              f" | suma=${work + backdrop:.4f}")
        print("Nowa sesja (/new) nie zabiera narzutu; sam kontekst startowy ~17,7 tys. tokenow"
              " (~$0,0027 przy swiezym cache). Mnoznikiem jest liczba wywolan API, nie dlugosc historii.")
    else:
        print("Uwaga: brak kolumny linii w session_model_usage — "
              "koszt licz z session_model_usage, nie z wiersza sessions.")


if __name__ == "__main__":
    main()
