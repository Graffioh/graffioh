import React, { useState, useRef, useEffect } from "react";

const MoneyRectangleDrawingTool = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectangle, setRectangle] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const ASPECT_RATIO = 2.35; // Aspect ratio of a dollar bill (6.14 / 2.61)

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (rectangle.width > 0 && rectangle.height > 0) {
      // Draw the green rectangle
      ctx.fillStyle = "#85bb65"; // Color closer to US dollar bill green
      ctx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);

      // Draw border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height,
      );

      // Draw the dollar symbol
      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.min(rectangle.width, rectangle.height) / 3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "$",
        rectangle.x + rectangle.width / 2,
        rectangle.y + rectangle.height / 2,
      );
    }
  }, [rectangle]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    setRectangle({ x: offsetX, y: offsetY, width: 0, height: 0 });
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const { offsetX, offsetY } = e.nativeEvent;

    let width = Math.abs(offsetX - startPoint.x);
    let height = width / ASPECT_RATIO;

    let x = startPoint.x;
    let y = startPoint.y;

    if (offsetX < startPoint.x) x = offsetX;
    if (offsetY < startPoint.y) y = offsetY;

    // Adjust based on drag direction
    if (offsetY < startPoint.y) {
      height = Math.abs(offsetY - startPoint.y);
      width = height * ASPECT_RATIO;
      y = startPoint.y - height;
      if (offsetX < startPoint.x) {
        x = startPoint.x - width;
      }
    }

    // Ensure the rectangle doesn't exceed canvas boundaries
    if (x < 0) {
      x = 0;
      width = startPoint.x;
      height = width / ASPECT_RATIO;
    }
    if (y < 0) {
      y = 0;
      height = startPoint.y;
      width = height * ASPECT_RATIO;
    }
    if (x + width > canvas.width) {
      width = canvas.width - x;
      height = width / ASPECT_RATIO;
    }
    if (y + height > canvas.height) {
      height = canvas.height - y;
      width = height * ASPECT_RATIO;
    }

    setRectangle({ x, y, width, height });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Money Drawing Tool</h2>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border border-gray-300"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <p>Click and drag to draw a dollar bill.</p>
      <p className="mt-2 text-sm text-gray-300">
        Made with claude 3.5 sonnet in 30 seconds
      </p>
    </div>
  );
};

export default MoneyRectangleDrawingTool;
