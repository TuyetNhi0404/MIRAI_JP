export interface Point {
  x: number;
  y: number;
}

export interface StrokeTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}


export const parseSVGPath = (
  d: string,
  numPoints: number = 50,
  scaleX = 1,
  scaleY = 1,
  transform: StrokeTransform = { scale: 1, offsetX: 0, offsetY: 0 }
): Point[] => {
  const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathElem.setAttribute("d", d);
  const totalLength = pathElem.getTotalLength();

  const points: Point[] = [];

  if (totalLength <= 0) return points;

  for (let i = 0; i < numPoints; i++) {
    const dist = (i / (numPoints - 1)) * totalLength;
    const p = pathElem.getPointAtLength(dist);
    const tx = (p.x * transform.scale + transform.offsetX) * scaleX;
    const ty = (p.y * transform.scale + transform.offsetY) * scaleY;
    points.push({ x: tx, y: ty });
  }
  return points;
};


export const resamplePath = (path: Point[], numPoints: number = 50): Point[] => {
  if (path.length === 0) return [];
  if (path.length === 1) return Array(numPoints).fill(path[0]);
  let totalLength = 0;
  const distances: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    totalLength += dist;
    distances.push(totalLength);
  }


  if (totalLength === 0) return Array(numPoints).fill(path[0]);

  const resampled: Point[] = [];
  resampled.push(path[0]);

  const step = totalLength / (numPoints - 1);
  let currentDist = step;
  let currentIdx = 1;

  for (let i = 1; i < numPoints - 1; i++) {
    while (currentIdx < path.length && distances[currentIdx] < currentDist) {
      currentIdx++;
    }


    const p1 = path[currentIdx - 1];
    const p2 = path[currentIdx];
    const d1 = distances[currentIdx - 1];
    const d2 = distances[currentIdx];


    if (d1 === d2) {
      resampled.push({ x: p2.x, y: p2.y });
    } else {
      const t = (currentDist - d1) / (d2 - d1);
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      resampled.push({ x, y });
    }
    currentDist += step;
  }

  resampled.push(path[path.length - 1]);
  return resampled;
};


export const calculateDistance = (path1: Point[], path2: Point[]): number => {
  if (path1.length !== path2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < path1.length; i++) {
    const dx = path1[i].x - path2[i].x;
    const dy = path1[i].y - path2[i].y;
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum / path1.length;
};


export const matchStroke = (
  userPath: Point[],
  standardSVGPathStr: string,
  canvasWidth: number,
  canvasHeight: number,
  transform: StrokeTransform = { scale: 1, offsetX: 0, offsetY: 0 }
) => {
  const scaleX = canvasWidth / 109;
  const scaleY = canvasHeight / 109;

  const numPoints = 30;
  const standardPoints = parseSVGPath(standardSVGPathStr, numPoints, scaleX, scaleY, transform);
  const userPointsResampled = resamplePath(userPath, numPoints);

  const distance = calculateDistance(userPointsResampled, standardPoints);


  const userPointsReversed = [...userPointsResampled].reverse();
  const reverseDistance = calculateDistance(userPointsReversed, standardPoints);
  const threshold = 55;

  const isCorrect = distance < threshold;
  const isReversed = reverseDistance < distance && reverseDistance < threshold;

  return {
    isCorrect,
    isReversed,
    distance,
    reverseDistance,
    standardPoints,
  };
};
