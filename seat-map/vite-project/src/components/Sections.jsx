import React, { useState } from 'react';

export default function SeatingLayoutMaker() {
  // --- Layout Matrix Generation Configuration ---
  const [layoutType, setLayoutType] = useState('linear');
  const [rows, setRows] = useState(4);
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [seatRadius, setSeatRadius] = useState(14);
  const [rowGap, setRowGap] = useState(45);
  const [seatGap, setSeatGap] = useState(40);
  const [arcRadius, setArcRadius] = useState(250);
  const [rowSpacingArc, setRowSpacingArc] = useState(45);
  const [arcAngleSpan, setArcAngleSpan] = useState(60);

  // --- Bounding Box / Group Positioning ---
  const [posX, setPosX] = useState(150);
  const [posY, setPosY] = useState(150);
  const [rotation, setRotation] = useState(0);

  // --- THE CORE STATE: Holds all active seats and their custom metadata ---
  const [seats, setSeats] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState(null);

  // --- Generate / Reset Layout Function ---
  const handleGenerateLayout = () => {
    const newSeats = [];

    for (let r = 0; r < rows; r++) {
      for (let s = 0; s < seatsPerRow; s++) {
        const seatId = `r${r + 1}-s${s + 1}`;
        let x = 0;
        let y = 0;

        if (layoutType === 'linear') {
          x = s * seatGap;
          y = r * rowGap;
        } else {
          const currentRadius = arcRadius + (r * rowSpacingArc);
          const totalAngleRad = (arcAngleSpan * Math.PI) / 180;
          const startAngle = -totalAngleRad / 2;
          const angleStep = seatsPerRow > 1 ? totalAngleRad / (seatsPerRow - 1) : 0;
          const currentAngle = startAngle + (s * angleStep);

          x = currentRadius * Math.sin(currentAngle);
          y = -currentRadius * Math.cos(currentAngle) + arcRadius;
        }

        // Default seat object template with metadata structure
        newSeats.push({
          id: seatId,
          row: r + 1,
          seatNum: s + 1,
          x,
          y,
          name: `Row ${r + 1} - Seat ${s + 1}`, // Default Name
          price: '10.00',                       // Default Price
          category: 'Standard'                  // Default Category
        });
      }
    }
    setSeats(newSeats);
    setSelectedSeatId(null);
  };

  // --- Find the currently selected seat data object ---
  const currentSelectedSeat = seats.find(seat => seat.id === selectedSeatId);

  // --- Update metadata properties for the selected seat ---
  const handleUpdateSeatMeta = (field, value) => {
    setSeats(prevSeats =>
      prevSeats.map(seat =>
        seat.id === selectedSeatId ? { ...seat, [field]: value } : seat
      )
    );
  };

  // --- Delete Selected Seat ---
  const handleDeleteSeat = () => {
    setSeats(prevSeats => prevSeats.filter(seat => seat.id !== selectedSeatId));
    setSelectedSeatId(null);
  };

  return (
    <div style={{ display: 'flex', fontFamily: 'sans-serif', gap: '20px', padding: '20px', color: '#333' }}>
      
      {/* LEFT SIDEBAR: Generator & Layout controls */}
      <div style={{ width: '300px', background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
        <h3>1. Layout Generator</h3>
        <label>Type: </label>
        <select value={layoutType} onChange={(e) => setLayoutType(e.target.value)}>
          <option value="linear">Linear Grid</option>
          <option value="arc">Arc / Curved</option>
        </select>

        <div style={{ marginTop: '10px' }}>
          <label>Rows ({rows}) & Seats ({seatsPerRow})</label><br/>
          <input type="range" min="1" max="15" value={rows} onChange={e => setRows(Number(e.target.value))} />
          <input type="range" min="1" max="20" value={seatsPerRow} onChange={e => setSeatsPerRow(Number(e.target.value))} />
        </div>

        <button 
          onClick={handleGenerateLayout} 
          style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {seats.length > 0 ? "Regenerate Layout (Overwrites)" : "Generate Layout Grid"}
        </button>

        <hr style={{ margin: '20px 0' }} />
        <h3>2. Bounding Box Position</h3>
        <div>
          <label>X-Offset: {posX}px</label>
          <input type="range" min="0" max="600" value={posX} onChange={e => setPosX(Number(e.target.value))} />
        </div>
        <div>
          <label>Y-Offset: {posY}px</label>
          <input type="range" min="0" max="600" value={posY} onChange={e => setPosY(Number(e.target.value))} />
        </div>
        <div>
          <label>Rotation: {rotation}°</label>
          <input type="range" min="0" max="360" value={rotation} onChange={e => setRotation(Number(e.target.value))} />
        </div>
      </div>

      {/* CENTER CANVAS WORKSPACE */}
      <div style={{ flexGrow: 1, border: '2px dashed #ccc', background: '#fafafa', borderRadius: '8px', overflow: 'hidden' }}>
        {seats.length === 0 ? (
          <div style={{ display: 'flex', height: '550px', justifyContent: 'center', alignItems: 'center', color: '#aaa' }}>
            Configure options and click "Generate Layout Grid" to start mapping.
          </div>
        ) : (
          <svg width="100%" height="550px" style={{ overflow: 'visible' }}>
            <g transform={`translate(${posX}, ${posY}) rotate(${rotation})`}>
              {seats.map((seat) => {
                const isSelected = selectedSeatId === seat.id;
                return (
                  <g 
                    key={seat.id} 
                    transform={`translate(${seat.x}, ${seat.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSeatId(seat.id);
                    }}
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r={seatRadius}
                      fill={isSelected ? '#ff4d4f' : '#1890ff'}
                      stroke={isSelected ? '#722ed1' : '#096dd9'}
                      strokeWidth={isSelected ? 3 : 1}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="white"
                      fontSize={seatRadius * 0.7}
                      style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 'bold' }}
                    >
                      {seat.seatNum}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {/* RIGHT SIDEBAR: Seat Properties Meta Editor */}
      <div style={{ width: '280px', background: '#eef2f7', padding: '15px', borderRadius: '8px' }}>
        <h3>3. Seat Properties</h3>
        {currentSelectedSeat ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#666' }}>System ID: {currentSelectedSeat.id}</span>
            </div>
            
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Seat Display Name:</label>
              <input 
                type="text" 
                style={{ width: '90%', padding: '6px', marginTop: '4px' }} 
                value={currentSelectedSeat.name} 
                onChange={(e) => handleUpdateSeatMeta('name', e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Ticket Pricing ($):</label>
              <input 
                type="number" 
                step="0.01"
                style={{ width: '90%', padding: '6px', marginTop: '4px' }} 
                value={currentSelectedSeat.price} 
                onChange={(e) => handleUpdateSeatMeta('price', e.target.value)} 
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Tier Category:</label>
              <select 
                style={{ width: '96%', padding: '6px', marginTop: '4px' }} 
                value={currentSelectedSeat.category} 
                onChange={(e) => handleUpdateSeatMeta('category', e.target.value)}
              >
                <option value="VIP">VIP Tier</option>
                <option value="Premium">Premium Tier</option>
                <option value="Standard">Standard Tier</option>
                <option value="Economy">Economy Tier</option>
              </select>
            </div>

            <button 
              onClick={handleDeleteSeat} 
              style={{ width: '100%', marginTop: '20px', padding: '8px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Delete This Seat
            </button>
          </div>
        ) : (
          <p style={{ color: '#777', fontSize: '14px', fontStyle: 'italic' }}>
            Select a specific seat on the active layout canvas to manage its naming, tier, and pricing attributes.
          </p>
        )}
      </div>

    </div>
  );
}