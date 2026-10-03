export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length === 0) {
    return null;
  }

  const n = xs.length;
  const meanX = xs.reduce((sum, v) => sum + v, 0) / n;
  const meanY = ys.reduce((sum, v) => sum + v, 0) / n;

  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  if (varianceX === 0 || varianceY === 0) {
    return null;
  }

  return covariance / Math.sqrt(varianceX * varianceY);
}

export const MIN_SAMPLE_SIZE = 5;

export interface CorrelationVariable {
  key: string;
  label: string;
  values: number[];
}

export interface CorrelationCell {
  rowKey: string;
  colKey: string;
  value: number | null;
}

export function buildCorrelationMatrix(variables: CorrelationVariable[]): CorrelationCell[][] {
  return variables.map((row) =>
    variables.map((col) => ({
      rowKey: row.key,
      colKey: col.key,
      value: row.key === col.key ? 1 : pearsonCorrelation(row.values, col.values),
    }))
  );
}

export const MIN_RANKING_SAMPLE_SIZE = 14;

function zScore(values: number[]): number[] {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (sd === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / sd);
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(augmented[pivotRow][col]) < 1e-9) return null;
    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row][col] / augmented[col][col];
      for (let c = col; c <= n; c++) augmented[row][c] -= factor * augmented[col][c];
    }
  }

  return augmented.map((row, i) => row[n] / row[i]);
}

function fitOLS(predictorColumns: number[][], target: number[]): number[] | null {
  const n = target.length;
  const k = predictorColumns.length;
  const p = k + 1;

  const design: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = [1];
    for (let j = 0; j < k; j++) row.push(predictorColumns[j][i]);
    design.push(row);
  }

  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty: number[] = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      xty[a] += design[i][a] * target[i];
      for (let b = 0; b < p; b++) xtx[a][b] += design[i][a] * design[i][b];
    }
  }

  return solveLinearSystem(xtx, xty);
}

function residualSumOfSquares(predictorColumns: number[][], target: number[], beta: number[]): number {
  let sum = 0;
  for (let i = 0; i < target.length; i++) {
    let predicted = beta[0];
    for (let j = 0; j < predictorColumns.length; j++) predicted += beta[j + 1] * predictorColumns[j][i];
    sum += (target[i] - predicted) ** 2;
  }
  return sum;
}

function regressionSumOfSquares(predictorColumns: number[][], target: number[], totalSumOfSquares: number): number | null {
  if (predictorColumns.length === 0) return 0;
  const beta = fitOLS(predictorColumns, target);
  if (!beta) return null;
  return totalSumOfSquares - residualSumOfSquares(predictorColumns, target, beta);
}

export interface FactorVarianceShare {
  key: string;
  label: string;
  sharePercent: number;
}

export type FactorRankingResult =
  | { status: 'insufficient-sample'; sampleSize: number; minRequired: number }
  | { status: 'no-variation' }
  | { status: 'ok'; shares: FactorVarianceShare[] };

export function rankFactorsByVarianceShare(
  target: number[],
  predictors: { key: string; label: string; values: number[] }[]
): FactorRankingResult {
  const n = target.length;
  if (n < MIN_RANKING_SAMPLE_SIZE) {
    return { status: 'insufficient-sample', sampleSize: n, minRequired: MIN_RANKING_SAMPLE_SIZE };
  }

  const zTarget = zScore(target);
  const totalSumOfSquares = zTarget.reduce((sum, v) => sum + v * v, 0);

  const withVariance = predictors
    .map((p) => ({ key: p.key, label: p.label, z: zScore(p.values), hasVariance: p.values.some((v) => v !== p.values[0]) }))
    .filter((p) => p.hasVariance);
  const withoutVariance = predictors.filter((p) => !withVariance.some((w) => w.key === p.key));

  if (totalSumOfSquares < 1e-9 || withVariance.length === 0) {
    return { status: 'no-variation' };
  }

  const fullColumns = withVariance.map((p) => p.z);
  const fullSS = regressionSumOfSquares(fullColumns, zTarget, totalSumOfSquares);
  if (fullSS === null) {
    return { status: 'no-variation' };
  }

  const contributions: { key: string; label: string; contribution: number }[] = [];
  for (let j = 0; j < withVariance.length; j++) {
    const reducedColumns = fullColumns.filter((_, idx) => idx !== j);
    const reducedSS = regressionSumOfSquares(reducedColumns, zTarget, totalSumOfSquares);
    const contribution = reducedSS === null ? 0 : Math.max(0, fullSS - reducedSS);
    contributions.push({ key: withVariance[j].key, label: withVariance[j].label, contribution });
  }
  for (const p of withoutVariance) {
    contributions.push({ key: p.key, label: p.label, contribution: 0 });
  }

  const totalContribution = contributions.reduce((sum, c) => sum + c.contribution, 0);
  if (totalContribution < 1e-9) {
    return { status: 'no-variation' };
  }

  const shares = contributions
    .map((c) => ({ key: c.key, label: c.label, sharePercent: (c.contribution / totalContribution) * 100 }))
    .sort((a, b) => b.sharePercent - a.sharePercent);

  return { status: 'ok', shares };
}
