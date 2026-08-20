import BigNumber from 'bignumber.js';

BigNumber.config({
  EXPONENTIAL_AT: [-1e9, 1e9],
  DECIMAL_PLACES: 18,
  ROUNDING_MODE: BigNumber.ROUND_DOWN
});

export class SubSyncNormalizer {
  public static normalizeTokenUnits(rawAmountWei: string, decimals: number): BigNumber {
    if (!/^[0-9]+$/.test(rawAmountWei)) {
      throw new Error(`INVALID_RAW_AMOUNT: ${rawAmountWei}`);
    }
    const raw = new BigNumber(rawAmountWei);
    const divisor = new BigNumber(10).pow(decimals);
    return raw.dividedBy(divisor);
  }

  public static evaluatePaymentStatus(
    fiatPaidUsd: BigNumber,
    expectedUsd?: number
  ): 'RECONCILED' | 'UNDERPAID' | 'OVERPAID' | 'CONFIRMED' {
    if (expectedUsd === undefined || expectedUsd <= 0) {
      return 'CONFIRMED';
    }
    const expected = new BigNumber(expectedUsd);
    const difference = fiatPaidUsd.minus(expected);

    if (difference.abs().isLessThanOrEqualTo(0.01)) {
      return 'RECONCILED';
    } else if (difference.isNegative()) {
      return 'UNDERPAID';
    } else {
      return 'OVERPAID';
    }
  }
}
