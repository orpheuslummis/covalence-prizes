// src/components/FractalPatternBackground.tsx

import React, { useMemo } from "react";
import { PrizeDetails } from "../lib/types";

interface FractalPatternBackgroundProps {
  prize: PrizeDetails;
  width?: number;
  height?: number;
  depth?: number;
}

const FractalPatternBackground: React.FC<FractalPatternBackgroundProps> = React.memo(
  ({ prize, width = 600, height = 600, depth = 5 }) => {
    const getSeed = (prizeData: PrizeDetails): number => {
      const str = prizeData.id.toString() + prizeData.name;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    const { triangles } = useMemo(() => {
      const seed = getSeed(prize);
      const hueBase = seed % 360;
      const saturation = 65; // Reduced for subtlety
      const lightness = 60;  // Adjusted for better contrast

      // Generate a color palette based on the seed using primary and secondary colors
      const colors = Array.from({ length: depth }, (_, i) => {
        const hue = (hueBase + i * 60) % 360; // Increased hue step for diversity
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      });

      // Recursive function to generate Sierpinski Triangle
      const generateTriangles = (
        x: number,
        y: number,
        size: number,
        currentDepth: number,
        trianglesArray: JSX.Element[],
      ) => {
        if (currentDepth === 0) {
          trianglesArray.push(
            <polygon
              key={`${x}-${y}-${size}-${currentDepth}`}
              points={`${x},${y} ${x + size / 2},${y + (Math.sqrt(3) / 2) * size} ${x - size / 2},${y + (Math.sqrt(3) / 2) * size}`}
              fill={colors[depth - currentDepth - (1 % colors.length)]}
              opacity={0.7}
            />,
          );
          return;
        }

        // Calculate the size for the next depth
        const newSize = size / 2;

        // Top triangle
        generateTriangles(x, y, newSize, currentDepth - 1, trianglesArray);
        // Bottom left triangle
        generateTriangles(x - newSize / 2, y + (Math.sqrt(3) / 2) * newSize, newSize, currentDepth - 1, trianglesArray);
        // Bottom right triangle
        generateTriangles(x + newSize / 2, y + (Math.sqrt(3) / 2) * newSize, newSize, currentDepth - 1, trianglesArray);
      };

      const trianglesArray: JSX.Element[] = [];
      const initialSize = width * 0.8; // 80% of the width
      const startX = width / 2;
      const startY = height * 0.1; // Start 10% from the top

      generateTriangles(startX, startY, initialSize, depth, trianglesArray);

      return { triangles: trianglesArray };
    }, [prize, depth, width, height]);

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        <rect width="100%" height="100%" fill={`hsl(${getSeed(prize) % 360}, 70%, 90%)`} />
        {triangles}
      </svg>
    );
  },
);

FractalPatternBackground.displayName = "FractalPatternBackground";

export default FractalPatternBackground;
