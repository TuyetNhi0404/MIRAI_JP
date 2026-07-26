import 'dart:math';
import 'package:flutter/material.dart';
import 'package:path_drawing/path_drawing.dart';

class StrokeMatchResult {
  final bool isCorrect;
  final bool isReversed;
  final double distance;
  final double reverseDistance;
  final List<Offset> standardPoints;

  StrokeMatchResult({
    required this.isCorrect,
    required this.isReversed,
    required this.distance,
    required this.reverseDistance,
    required this.standardPoints,
  });
}

class StrokeMatching {
  static List<Offset> resamplePath(List<Offset> path, {int numPoints = 30}) {
    if (path.isEmpty) return [];
    if (path.length == 1) return List.filled(numPoints, path[0]);
    
    double totalLength = 0;
    List<double> distances = [0];
    
    for (int i = 1; i < path.length; i++) {
      final dx = path[i].dx - path[i - 1].dx;
      final dy = path[i].dy - path[i - 1].dy;
      final dist = sqrt(dx * dx + dy * dy);
      totalLength += dist;
      distances.add(totalLength);
    }

    if (totalLength == 0) return List.filled(numPoints, path[0]);

    List<Offset> resampled = [path[0]];
    final step = totalLength / (numPoints - 1);
    double currentDist = step;
    int currentIdx = 1;

    for (int i = 1; i < numPoints - 1; i++) {
      while (currentIdx < path.length && distances[currentIdx] < currentDist) {
        currentIdx++;
      }

      final p1 = path[currentIdx - 1];
      final p2 = path[currentIdx];
      final d1 = distances[currentIdx - 1];
      final d2 = distances[currentIdx];

      if (d1 == d2) {
        resampled.add(p2);
      } else {
        final t = (currentDist - d1) / (d2 - d1);
        final x = p1.dx + (p2.dx - p1.dx) * t;
        final y = p1.dy + (p2.dy - p1.dy) * t;
        resampled.add(Offset(x, y));
      }
      currentDist += step;
    }

    resampled.add(path.last);
    // Safety check just in case float math goes quirky
    if (resampled.length > numPoints) resampled = resampled.take(numPoints).toList();
    if (resampled.length < numPoints) {
      while (resampled.length < numPoints) {
        resampled.add(path.last);
      }
    }
    return resampled;
  }

  static double calculateDistance(List<Offset> path1, List<Offset> path2) {
    if (path1.length != path2.length) return double.infinity;
    double sum = 0;
    for (int i = 0; i < path1.length; i++) {
      final dx = path1[i].dx - path2[i].dx;
      final dy = path1[i].dy - path2[i].dy;
      sum += sqrt(dx * dx + dy * dy);
    }
    return sum / path1.length;
  }

  static List<Offset> parseSvgPath(String svgPathStr, double scaleX, double scaleY, {int numPoints = 30}) {
    // Parse using path_drawing
    final Path dartPath = parseSvgPathData(svgPathStr);
    
    // Scale the path
    final Matrix4 matrix = Matrix4.identity()..scale(scaleX, scaleY);
    final Path scaledPath = dartPath.transform(matrix.storage);

    final List<Offset> points = [];
    final metrics = scaledPath.computeMetrics().toList();
    
    if (metrics.isEmpty) return [];

    // Assuming a single continuous contour for one stroke
    final metric = metrics.first; 
    final totalLength = metric.length;

    if (totalLength <= 0) return [];

    for (int i = 0; i < numPoints; i++) {
      final dist = (i / (numPoints - 1)) * totalLength;
      final tangent = metric.getTangentForOffset(dist);
      if (tangent != null) {
        points.add(tangent.position);
      }
    }
    
    return points;
  }

  static StrokeMatchResult matchStroke(
    List<Offset> userPath,
    String standardSVGPathStr,
    double canvasWidth,
    double canvasHeight,
  ) {
    // Original web app SVG was laid out on a 109x109 canvas viewport
    final scaleX = canvasWidth / 109.0;
    final scaleY = canvasHeight / 109.0;
    const numPoints = 30;

    final standardPoints = parseSvgPath(standardSVGPathStr, scaleX, scaleY, numPoints: numPoints);
    if (standardPoints.isEmpty) {
      return StrokeMatchResult(
        isCorrect: false,
        isReversed: false,
        distance: double.infinity,
        reverseDistance: double.infinity,
        standardPoints: [],
      );
    }

    final userPointsResampled = resamplePath(userPath, numPoints: numPoints);
    final distance = calculateDistance(userPointsResampled, standardPoints);

    final userPointsReversed = userPointsResampled.reversed.toList();
    final reverseDistance = calculateDistance(userPointsReversed, standardPoints);

    // The threshold from the web version
    const threshold = 55.0;

    final isCorrect = distance < threshold;
    final isReversed = reverseDistance < distance && reverseDistance < threshold;

    return StrokeMatchResult(
      isCorrect: isCorrect,
      isReversed: isReversed,
      distance: distance,
      reverseDistance: reverseDistance,
      standardPoints: standardPoints,
    );
  }
}
