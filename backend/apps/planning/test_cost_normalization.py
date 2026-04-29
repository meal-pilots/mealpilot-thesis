"""Parametric tests for cross-unit cost normalization.

Covers every supported (quantity_unit, price_unit) pair plus a representative
sample of unsupported pairs that should fall back to zero rather than blow up.
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from apps.planning.services import _normalize_ingredient_cost


@pytest.mark.unit
@pytest.mark.parametrize(
    'quantity, q_unit, price_amount, p_unit, expected',
    [
        (Decimal('500'), 'g', Decimal('1200'), 'kg', Decimal('600.0')),
        (Decimal('2'), 'kg', Decimal('1200'), 'kg', Decimal('2400')),
        (Decimal('250'), 'ml', Decimal('800'), 'l', Decimal('200.0')),
        (Decimal('1'), 'l', Decimal('800'), 'l', Decimal('800')),
        (Decimal('1'), 'cup', Decimal('1500'), 'l', Decimal('360.00')),
        (Decimal('1'), 'cup', Decimal('1200'), 'kg', Decimal('240.0')),
        (Decimal('1'), 'tbsp', Decimal('1500'), 'l', Decimal('22.500')),
        (Decimal('1'), 'tsp', Decimal('1500'), 'l', Decimal('7.500')),
        (Decimal('3'), 'pc', Decimal('200'), 'pc', Decimal('600')),
        (Decimal('3'), 'pcs', Decimal('200'), 'piece', Decimal('600')),
        (Decimal('100'), 'g', Decimal('1200'), 'l', Decimal('120.0')),
    ],
)
def test_known_cross_unit_pairs(quantity, q_unit, price_amount, p_unit, expected):
    result = _normalize_ingredient_cost(
        quantity=quantity,
        quantity_unit=q_unit,
        price_amount=price_amount,
        price_unit=p_unit,
    )
    assert pytest.approx(float(result), rel=1e-3) == float(expected)


@pytest.mark.unit
def test_unsupported_unit_pair_returns_zero():
    result = _normalize_ingredient_cost(
        quantity=Decimal('1'),
        quantity_unit='galaxy',
        price_amount=Decimal('1000'),
        price_unit='kg',
    )
    assert result == Decimal('0.00')


@pytest.mark.unit
def test_same_unit_does_not_lose_precision():
    result = _normalize_ingredient_cost(
        quantity=Decimal('1.234'),
        quantity_unit='kg',
        price_amount=Decimal('999.99'),
        price_unit='kg',
    )
    assert result == Decimal('1.234') * Decimal('999.99')
