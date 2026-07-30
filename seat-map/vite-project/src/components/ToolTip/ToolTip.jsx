// import { useMemo } from "react";

// function SeatTooltip({
//   x,
//   y,

//   // Customizable dimensions
//   width = 150,
//   height = 82,

//   // right | left | top | bottom
//   direction = "right",

//   // Distance between seat and tooltip
//   gap = 8,

//   seat = {
//     number: "A12",
//     category: "Premium",
//     price: "₹450",
//     status: "Available",
//   },

//   // Customizable colors
//   background = "#FFFFFF",
//   border = "#CBD5E1",
//   textColor = "#0F172A",
//   secondaryColor = "#64748B",
//   accentColor = "#2563EB",
//   availableColor = "#16A34A",
//   unavailableColor = "#DC2626",
// }) {
//   const tooltipTransform = useMemo(() => {
//     switch (direction) {
//       case "left":
//         return `translate(${x - width - gap}, ${y - height / 2})`;

//       case "top":
//         return `translate(${x - width / 2}, ${y - height - gap})`;

//       case "bottom":
//         return `translate(${x - width / 2}, ${y + gap})`;

//       case "right":
//       default:
//         return `translate(${x + gap}, ${y - height / 2})`;
//     }
//   }, [x, y, width, height, gap, direction]);

//   /*
//     Keep the tooltip content proportional when
//     width / height changes.
//   */
//   const padding = Math.max(8, width * 0.07);

//   const titleSize = Math.max(9, width * 0.073);
//   const textSize = Math.max(7, width * 0.06);

//   const dividerY = height * 0.31;

//   const row1Y = height * 0.52;
//   const row2Y = height * 0.75;

//   const pointerSize = Math.min(8, width * 0.05);

//   const statusColor =
//     seat.status === "Available"
//       ? availableColor
//       : unavailableColor;

//   const pointer = () => {
//     switch (direction) {
//       case "left":
//         return (
//           <path
//             d={`
//               M ${width} ${height * 0.42}
//               L ${width + pointerSize} ${height * 0.50}
//               L ${width} ${height * 0.58}
//               Z
//             `}
//             fill={background}
//             stroke={border}
//             strokeWidth="1"
//             strokeLinejoin="round"
//           />
//         );

//       case "top":
//         return (
//           <path
//             d={`
//               M ${width * 0.45} ${height}
//               L ${width * 0.50} ${height + pointerSize}
//               L ${width * 0.55} ${height}
//               Z
//             `}
//             fill={background}
//             stroke={border}
//             strokeWidth="1"
//             strokeLinejoin="round"
//           />
//         );

//       case "bottom":
//         return (
//           <path
//             d={`
//               M ${width * 0.45} 0
//               L ${width * 0.50} ${-pointerSize}
//               L ${width * 0.55} 0
//               Z
//             `}
//             fill={background}
//             stroke={border}
//             strokeWidth="1"
//             strokeLinejoin="round"
//           />
//         );

//       case "right":
//       default:
//         return (
//           <path
//             d={`
//               M 0 ${height * 0.42}
//               L ${-pointerSize} ${height * 0.50}
//               L 0 ${height * 0.58}
//               Z
//             `}
//             fill={background}
//             stroke={border}
//             strokeWidth="1"
//             strokeLinejoin="round"
//           />
//         );
//     }
//   };

//   return (
//     <g
//       transform={tooltipTransform}
//       pointerEvents="none"
//     >
//       {/* Pointer */}
//       {pointer()}

//       {/* Tooltip background */}
//       <rect
//         x="0"
//         y="0"
//         width={width}
//         height={height}
//         rx={Math.min(8, width * 0.05)}
//         fill={background}
//         stroke={border}
//         strokeWidth="1"
//       />

//       {/* Header */}
//       <text
//         x={padding}
//         y={height * 0.20}
//         fontSize={titleSize}
//         fontWeight="600"
//         fill={textColor}
//         dominantBaseline="middle"
//       >
//         Seat {seat.number}
//       </text>

//       {/* Divider */}
//       <line
//         x1={padding}
//         y1={dividerY}
//         x2={width - padding}
//         y2={dividerY}
//         stroke={border}
//         strokeWidth="1"
//       />

//       {/* Category */}
//       <text
//         x={padding}
//         y={row1Y}
//         fontSize={textSize}
//         fill={secondaryColor}
//         dominantBaseline="middle"
//       >
//         {seat.category}
//       </text>

//       {/* Price */}
//       <text
//         x={width - padding}
//         y={row1Y}
//         fontSize={textSize}
//         fontWeight="600"
//         fill={accentColor}
//         textAnchor="end"
//         dominantBaseline="middle"
//       >
//         {seat.price}
//       </text>

//       {/* Status dot */}
//       <circle
//         cx={padding + 3}
//         cy={row2Y}
//         r={Math.max(2, width * 0.018)}
//         fill={statusColor}
//       />

//       {/* Status */}
//       <text
//         x={padding + 10}
//         y={row2Y}
//         fontSize={textSize}
//         fill={secondaryColor}
//         dominantBaseline="middle"
//       >
//         {seat.status}
//       </text>
//     </g>
//   );
// }

// export default SeatTooltip;