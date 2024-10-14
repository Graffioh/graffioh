import React, { useState, useRef, useEffect } from "react";

const MoneyRectangleDrawingTool = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBill, setCurrentBill] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [bills, setBills] = useState([]);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const ASPECT_RATIO = 2.35; // Aspect ratio of a dollar bill (6.14 / 2.61)

  useEffect(() => {
    drawCanvas();
  }, [bills, currentBill]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved bills
    bills.forEach((bill) => drawBill(ctx, bill));

    // Draw current bill being drawn
    if (isDrawing) {
      drawBill(ctx, currentBill);
    }
  };

  const drawBill = (ctx, bill) => {
    if (bill.width > 0 && bill.height > 0) {
      ctx.fillStyle = "#85bb65";
      ctx.fillRect(bill.x, bill.y, bill.width, bill.height);

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(bill.x, bill.y, bill.width, bill.height);

      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.min(bill.width, bill.height) / 3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", bill.x + bill.width / 2, bill.y + bill.height / 2);
    }
  };

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    setCurrentBill({ x: offsetX, y: offsetY, width: 0, height: 0 });
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

    if (offsetY < startPoint.y) {
      height = Math.abs(offsetY - startPoint.y);
      width = height * ASPECT_RATIO;
      y = startPoint.y - height;
      if (offsetX < startPoint.x) {
        x = startPoint.x - width;
      }
    }

    // Ensure the bill doesn't exceed canvas boundaries
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

    setCurrentBill({ x, y, width, height });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setBills((prevBills) => [...prevBills, currentBill]);
      setIsDrawing(false);
      setCurrentBill({ x: 0, y: 0, width: 0, height: 0 });
    }
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
