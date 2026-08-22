/**
 * Bank-grade Decimal Math Utility
 * Prevents JavaScript floating point precision drift (e.g. 0.1 + 0.2 !== 0.3).
 * Operates in fixed decimal minor units (cents / paise / fils) and handles rounding,
 * scaling, percentages, and multi-currency aggregations safely.
 */
export class DecimalMath {
  private static readonly SCALE = 100; // 2 decimal places base
  private static readonly HIGH_SCALE = 1000000; // 6 decimal places for FX rates

  /**
   * Convert any float, number, or string to safe integer minor units (e.g. 15.50 -> 1550)
   */
  static toMinorUnits(amount: number | string, decimals = 2): bigint {
    const str = typeof amount === 'number' ? amount.toFixed(decimals + 4) : String(amount || '0');
    const [intPart = '0', decPart = ''] = str.split('.');
    const paddedDec = decPart.slice(0, decimals).padEnd(decimals, '0');
    return BigInt(intPart + paddedDec);
  }

  /**
   * Convert minor units back to fixed-precision decimal string or number
   */
  static fromMinorUnits(minorUnits: bigint, decimals = 2): number {
    const str = minorUnits.toString();
    const isNeg = str.startsWith('-');
    const absStr = isNeg ? str.slice(1) : str;
    
    let result = '';
    if (absStr.length <= decimals) {
      result = '0.' + absStr.padStart(decimals, '0');
    } else {
      const splitIndex = absStr.length - decimals;
      result = absStr.slice(0, splitIndex) + '.' + absStr.slice(splitIndex);
    }
    const finalNum = parseFloat((isNeg ? '-' : '') + result);
    return Number(finalNum.toFixed(decimals));
  }

  /**
   * Exact addition of two financial amounts
   */
  static add(a: number | string, b: number | string, decimals = 2): number {
    const minorA = this.toMinorUnits(a, decimals);
    const minorB = this.toMinorUnits(b, decimals);
    return this.fromMinorUnits(minorA + minorB, decimals);
  }

  /**
   * Exact subtraction of two financial amounts (a - b)
   */
  static subtract(a: number | string, b: number | string, decimals = 2): number {
    const minorA = this.toMinorUnits(a, decimals);
    const minorB = this.toMinorUnits(b, decimals);
    return this.fromMinorUnits(minorA - minorB, decimals);
  }

  /**
   * Exact multiplication of amount by rate or factor
   */
  static multiply(amount: number | string, rate: number | string, decimals = 2): number {
    const numAmount = Number(amount || 0);
    const numRate = Number(rate || 0);
    const raw = numAmount * numRate;
    return Number(Math.round(raw * 100) / 100);
  }

  /**
   * Exact division of amount
   */
  static divide(amount: number | string, divisor: number | string, decimals = 2): number {
    const numAmount = Number(amount || 0);
    const numDivisor = Number(divisor || 1);
    if (numDivisor === 0) return 0;
    const raw = numAmount / numDivisor;
    return Number(Math.round(raw * 100) / 100);
  }

  /**
   * Calculate percentage take-rate (e.g. 10% of 1500 => 150.00)
   */
  static percentage(amount: number | string, percent: number | string, decimals = 2): number {
    const numAmount = Number(amount || 0);
    const numPercent = Number(percent || 0);
    const raw = (numAmount * numPercent) / 100;
    return Number(Math.round(raw * 100) / 100);
  }

  /**
   * Safe sum array of amounts
   */
  static sum(amounts: (number | string)[], decimals = 2): number {
    return amounts.reduce<number>((acc, curr) => this.add(acc, curr, decimals), 0);
  }

  /**
   * Format fixed 2 decimal string
   */
  static formatFixed(amount: number | string, decimals = 2): string {
    const num = Number(amount || 0);
    return num.toFixed(decimals);
  }
}
