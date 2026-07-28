import React, { useState } from 'react';

const  ToolTip = ({
  x,
  y,
  text,
  children,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  offset = 5,     // Distance from the target point
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Split multi-line string into an array (handles \n or direct multiline strings)
  const lines = Array.isArray(text) ? text : text.split('\n');

  // Compute position offsets for foreignObject and Arrow
  const getLayout = () => {
    switch (position) {
      case 'bottom':
        return {
          foX: x - 100,
          foY: y + offset,
          align: 'items-start justify-center',
          arrowPoints: `${x},${y + offset} ${x - 6},${y + offset + 6} ${x + 6},${y + offset + 6}`,
        };
      case 'left':
        return {
          foX: x - 200 - offset,
          foY: y - 50,
          align: 'items-center justify-end',
          arrowPoints: `${x - offset},${y} ${x - offset - 6},${y - 6} ${x - offset - 6},${y + 6}`,
        };
      case 'right':
        return {
          foX: x + offset,
          foY: y - 50,
          align: 'items-center justify-start',
          arrowPoints: `${x + offset},${y} ${x + offset + 6},${y - 6} ${x + offset + 6},${y + 6}`,
        };
      case 'top':
      default:
        return {
          foX: x - 100,
          foY: y - 100 - offset,
          align: 'items-end justify-center',
          arrowPoints: `${x},${y - offset} ${x - 6},${y - offset - 6} ${x + 6},${y - offset - 6}`,
        };
    }
  };

  const { foX, foY, align, arrowPoints } = getLayout();

  return (
    <g
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      className="cursor-pointer"
    >
      {/* Target SVG Child Element */}
      {children}

      {isVisible && (
        <g className="pointer-events-none">
          {/* SVG Arrow Pointing Directly to (x, y) */}
          <polygon points={arrowPoints} className="fill-white" />

          {/* HTML Multi-Line Container */}
          <foreignObject
            x={foX}
            y={foY}
            width="200"
            height="100"
            className="overflow-visible"
          >
            {/* <div className={`flex w-full h-full ${align}`}>
              <div className="w-fit rounded-lg bg-white px-3 py-2 text-[2px] font-medium leading-relaxed text-gray-800 shadow-xl backdrop-blur-sm">
                {lines.map((line, index) => (
                  <p key={index} className="whitespace-pre-wrap break-words w-fit">
                    {line}
                  </p>
                ))}
              </div>
            </div> */}
          </foreignObject>
        </g>
      )}
    </g>
  );
};

export default ToolTip;