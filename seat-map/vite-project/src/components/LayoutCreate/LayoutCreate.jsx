import { useState, useEffect, Fragment, useRef, useCallback } from 'react'
import panzoom from 'panzoom'
import ImageUpload from '../ImageUpload/ImageUpload.jsx'
import { Link } from 'react-router-dom'

function LayoutCreate({ setDisplayLayout, setformData }) {
  const [count, setCount] = useState(0)
  const [radius, setRadius] = useState([])
  const [inverted, setInverted] = useState([])
  const [remaining, setRemaining] = useState([])
  const [arcPoints, setarcPoints] = useState([])
  const [polygonPoints, setpolygonPoints] = useState([])
  const [linePoints, setlinePoints] = useState([])
  const [figure, setFigure] = useState('line')
  const [lastPoints, setLastPoints] = useState([])
  const [polysides, setPolysides] = useState([])
  const [tempSide, setTempSide] = useState()
  const [tempPolygon, setTempPolygon] = useState([])
  const [polyarc, setPolyarc] = useState([])
  const [temppolyarc, setTemppolyarc] = useState([])
  const [clicked, setClicked] = useState(false)
  const [Image, setImage] = useState(null)
  const [sectionName, setSectionName] = useState([])
  const [isSectionCreated, setIsSectionCreated] = useState(true)
  const sceneRef = useRef()
  const currentCordinates = useRef(null)
  const isDragged = useRef(false)
  const sectionNameInput = useRef({})
  const sectionPriceInput = useRef({})
  const seatLayoutRows = useRef({})
  const seatLayoutCols = useRef({})
  const seatLayoutType = useRef({})
  const seatNameRef = useRef({})
  const seatPriceRef = useRef({})
  const seatTierRef = useRef({})
  const rows = 50
  const columns = 50
  const panzoomInstance = useRef(null);
  // Tracks selected seats for deletion. 
  const [selectedSeats, setSelectedSeats] = useState(new Set());

  // Tracks the seat currently opened for detail editing
  const [editingSeat, setEditingSeat] = useState(null);

  // Global click delegation handler on the SVG groups
  const handleSeatClick = (e, groupIdx, index) => {
    const seat = e.target.closest('circle')
    if (!seat) return;

    const row = parseInt(seat.dataset.row, 10)
    const col = parseInt(seat.dataset.col, 10)
    const secIdx = index
    const grpIdx = groupIdx

    const seatKey = `${secIdx}_${grpIdx}_${col}_${row}`;

    // If holding Shift or Ctrl/Cmd key, toggle multi-select mode for deletion
    if (!sectionName[secIdx].seatDone) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedSeats((prev) => {
          const next = new Set(prev);
          if (next.has(seatKey)) next.delete(seatKey);
          else next.add(seatKey);
          return next;
        });
      } else {
        if (JSON.stringify(editingSeat) === JSON.stringify({ secIdx, grpIdx, col, row, seatKey })) {
          setEditingSeat(null)
        } else {
          setEditingSeat({ secIdx, grpIdx, col, row, seatKey });
        }
      }
    }
  };

  // Bulk Delete Handler
  const deleteSelectedSeats = () => {
    let val = [...selectedSeats]
    for (let value of val) {
      let arr = value.split('_')
      for (let i = 0; i < 4; i++) {
        arr[i] = parseInt(arr[i])
      }
      let newSectionName = [...sectionName]
      newSectionName[arr[0]].seats[arr[1]]?.deletedSeats.push(`row${arr[3]}-col${arr[2]}`)
      setSectionName(newSectionName)
    }
    if (editingSeat && selectedSeats.has(editingSeat.seatKey)) {
      setEditingSeat(null)
    }
    setSelectedSeats(new Set());
  };

  const makeFigure = (event) => {
    // Use offsetX/Y so coordinates map perfectly inside the canvas container
    if (figure === 'arc') {

      setRadius([...radius, 100])
      setInverted([...inverted, 0])
      setRemaining([...remaining, 0])
      setarcPoints([...arcPoints, [event.X, event.Y]]);
      setLastPoints([...lastPoints, figure])
    }
    else if (figure === 'line') {

      setlinePoints([...linePoints, [event.X, event.Y]]);
      setLastPoints([...lastPoints, figure])
    }
    else if (figure === 'polygon' && clicked) {
      if (tempPolygon.length < tempSide - 1) {
        if (event.button === 0) {
          setTempPolygon([...tempPolygon, ({ x: event.X, y: event.Y, figure: 'line' })])
          setTemppolyarc([...temppolyarc, ({})])
        } else {
          setTempPolygon([...tempPolygon, ({ x: event.X, y: event.Y, figure: 'arc' })])
          setTemppolyarc([...temppolyarc, ({ radius: 100, inverted: 0, remaining: 0 })])
        }
      }
      else if (tempPolygon.length === tempSide - 1) {
        if (event.button === 0) {
          setpolygonPoints([...polygonPoints, [...tempPolygon, ({ x: event.X, y: event.Y, figure: 'line' })]])
          setPolyarc([...polyarc, [...temppolyarc, ({})]])
        } else {
          setpolygonPoints([...polygonPoints, [...tempPolygon, ({ x: event.X, y: event.Y, figure: 'arc' })]])
          setPolyarc([...polyarc, [...temppolyarc, ({ radius: 100, inverted: 0, remaining: 0 })]])
        }
        setTempPolygon([])
        setTemppolyarc([])
        setLastPoints([...lastPoints, figure])
        setClicked(false)
        setIsSectionCreated(true)
      }
    }
  }

  const undo = useCallback(() => {
    if (lastPoints[lastPoints.length - 1] === 'line') {

      setlinePoints((linePoints) => {
        let new_linePoints = [...linePoints]
        new_linePoints.pop()
        new_linePoints.pop()
        return new_linePoints
      })
      setLastPoints((lastPoints) => {
        let new_lastPoints = [...lastPoints]
        new_lastPoints.pop()
        new_lastPoints.pop()
        return new_lastPoints
      })
    }
    else if (lastPoints[lastPoints.length - 1] === 'arc') {

      setarcPoints((arcPoints) => {
        let new_arcPoints = [...arcPoints]
        new_arcPoints.pop()
        new_arcPoints.pop()
        return new_arcPoints
      })
      setLastPoints((lastPoints) => {
        let new_lastPoints = [...lastPoints]
        new_lastPoints.pop()
        new_lastPoints.pop()
        return new_lastPoints
      })
    }
    else if (lastPoints[lastPoints.length - 1] === 'polygon') {
      if (sectionName.length === polygonPoints.length) {
        setSectionName((lastName) => {
          let newSectionName = [...lastName]
          newSectionName.pop()
          console.log(newSectionName)
          console.log('deleted')
          return newSectionName
        })
      }
      setpolygonPoints((polygonPoints) => {
        let new_polyPoints = [...polygonPoints]
        new_polyPoints?.pop()
        return new_polyPoints
      })
      setLastPoints((lastPoints) => {
        let new_lastPoints = [...lastPoints]
        new_lastPoints?.pop()
        return new_lastPoints
      })
      setPolysides((polysides) => {
        let new_polySides = [...polysides]
        new_polySides?.pop()
        return new_polySides
      })
    }
  }, [linePoints, arcPoints, polygonPoints, sectionName, polysides, lastPoints])

  const changeFigure = (event) => {
    setFigure(event.target.value)
  }



  // CTRL + Z for undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "z") {
        console.log("Global undo triggered");
        undo();
      }
    };

    // Listen to the entire browser window instead of a single element
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo]); // Include undo in dependencies if it changes dynamically

  useEffect(() => {
    if (sceneRef.current) {

      panzoomInstance.current = panzoom(sceneRef.current, {
        maxZoom: 40,
        minZoom: 1,
        zoomSpeed: 0.065,
        bounds: true,
        boundsPadding: 1,

      });
    }

    // CRITICAL: Clean up event listeners when the component unmounts
    return () => {
      if (panzoomInstance.current) {
        panzoomInstance.current.dispose();
      }
    };
  }, []);


  const handleGridMouseDown = (e) => {
    if (e.target.id === 'svg_canvas') {
      currentCordinates.current = { X: e.nativeEvent.offsetX, Y: e.nativeEvent.offsetY, button: e.button }
    }
  }

  const handleGridMouseMove = (e) => {
    if (currentCordinates.current != null) {
      if (Math.abs(e.nativeEvent.offsetX - currentCordinates.current.X) > 1 || Math.abs(e.nativeEvent.offsetY - currentCordinates.current.Y) > 1) {
        isDragged.current = true
        currentCordinates.current = null
        // e.target.style = "cursor:grabbing"
      }
    }

  }

  const handleGridMouseUp = () => {
    if (!isDragged.current) {
      makeFigure(currentCordinates.current)
      currentCordinates.current = null
    } else {
      isDragged.current = false
    }
  }

  const handleAddSection = () => {
    setFigure('polygon')
    setIsSectionCreated(false)
  }

  const handleEnter = (e) => {
    if (e.key === 'Enter' && tempSide && polygonPoints.length === polysides.length) {
      alert('Left click for line and Right click for arcs')
      setClicked(true)
      setPolysides([...polysides, tempSide])
    }
  }

  const saveSeatLayout = () => {
    let seatLayout = {}
    for (let idx in sectionName) {
      seatLayout[sectionName[idx].text] = {
        name: sectionName[idx].text,
        price: sectionName[idx].price,
        textX: sectionName[idx].x,
        textY: sectionName[idx].y,
        textAngle: sectionName[idx].rotate,
        textFont: sectionName[idx].font,
        color : sectionName[idx].color,
        seats: {},
        points: {}
      }
      for (let seatIdx in sectionName[idx].seats) {
        seatLayout[sectionName[idx].text].seats[`layout${parseInt(seatIdx) + 1}`] = sectionName[idx].seats[seatIdx]
      }
      let d = `M${polygonPoints[idx][0].x} ${polygonPoints[idx][0].y}`
      polygonPoints[idx].forEach((element, index) => {
        if (element.figure === 'arc') {
          let combined = { ...element, ...polyarc[idx][index] }
          seatLayout[sectionName[idx].text].points[`point${index + 1}`] = combined
          if (index != 0) d += ` A${combined.radius} ${combined.radius} 0 ${combined.remaining} ${combined.inverted} ${combined.x} ${combined.y}`
        } else {
          seatLayout[sectionName[idx].text].points[`point${index + 1}`] = element
          if (index != 0) d += ` L${element.x} ${element.y}`
        }
      });
      if (polygonPoints[idx][0].figure === 'arc') d += ` A${polygonPoints[idx][0].radius} ${polygonPoints[idx][0].radius} 0 ${polygonPoints[idx][0].remaining} ${polygonPoints[idx][0].inverted} ${polygonPoints[idx][0].x} ${polygonPoints[idx][0].y}`
      else { d += ' Z' }
      seatLayout[sectionName[idx].text].d = d
    }
    console.log(seatLayout)
    setformData((prev) => {
      const newData = { ...prev, seatLayout }
      console.log(newData)
      return newData
    })

    navigator.clipboard.writeText(JSON.stringify(seatLayout));
    setDisplayLayout('none')
    alert("Saved")
  }

  const handleSectionClick = (event, textX, textY) => {
    const pathElement = event.target;
    const panzoom = panzoomInstance.current;

    console.log(panzoom)
    // Guard clause to ensure panzoom instance exists
    if (!panzoom) return;

    // 1. Get the precise bounding geometry of the clicked path shape
    const box = pathElement.getBBox();

    // 2. Find the exact center coordinates of the target section
    const centerX = polygonPoints[0][0].x
    const centerY = polygonPoints[0][0].y

    console.log(centerX, centerY)
    console.log(textX, textY)

    // 3. Calculate your ideal target scale factor (assuming 800x800 canvas)
    const scaleX = 800 / box.width;
    const scaleY = 800 / box.height;
    const targetScale = Math.min(scaleX, scaleY)  // 25% boundary padding

    // 4. FIX: Use zoomToPoint instead of zoom. 
    // This scales and shifts the view to frame the coordinates seamlessly.
    // panzoom.zoomAbs(0, 0, targetScale);
    // panzoom.smoothMoveTo(160,160)
  };



  return (
    <>
      <div className="flex">

        <div className="w-137" pointerEvents="none">
          <ImageUpload setImage={setImage} />


          <div>
            <button className='border rounded border-white pl-1 pr-1 m-2 bg-[#1f559b] cursor-pointer block' onClick={handleAddSection}>Add Section</button>
            {[figure].map((element, index) => {
              if (element === 'polygon' && !isSectionCreated) {
                return (
                  <Fragment key={index}>
                    <label htmlFor="sides" className='ml-1'>Sides</label>
                    <input type="text" id='sides' name='sides' placeholder='Enter no. of sides of polygon' className='pl-1 border border-white rounded m-1' onChange={(e) => { setTempSide(parseInt((e.target.value).trim())) }} onKeyDown={handleEnter}></input>
                    <button className="cursor-pointer border border-white bg-amber-300 text-white pl-2 pr-2 rounded m-1" onClick={() => {
                      if (tempSide && polygonPoints.length === polysides.length) {
                        alert('Left click for line and Right click for arcs')
                        setClicked(true)
                        setPolysides([...polysides, tempSide])
                      }
                    }}>Set</button>
                  </Fragment>
                )
              }
            })}
          </div>



          {/* <div className="choose">
            <label htmlFor="figure_choose">Figure</label>
            <select name="figure_choose" id="figure_choose" className='border border-white rounded m-1' onChange={changeFigure}>
              <option value="line">Line</option>
              <option value="arc">Arc</option>
              <option value="polygon">Polygon</option>
            </select>
          </div> */}


          {/* {arcPoints.map((element, index) => { // radius and the inverted checkbox section for each arc
            if (((index + 2) <= arcPoints.length && index % 2 === 0) && arcPoints.length > 0) {

              return (
                <Fragment key={`${index}`}>
                  <div className="radius flex m-auto">
                    <label htmlFor={`radius:${index / 2 + 1}`}>{`Radius: Arc${index / 2 + 1}  `}</label>
                    <input type="number" id={`radius:${index / 2 + 1}`} step={1} min={1} max={1000} defaultValue='100' className='border border-amber-50 rounded pl-0.5 ml-0.5' onChange={(e) => {
                      setRadius(prev => {
                        const newRadii = [...prev];
                        newRadii[index / 2] = e.target.value;
                        return newRadii;
                      })
                    }} />
                    <div className={`radius${index / 2 + 1}value`}>{radius[index / 2]}</div>
                    <label htmlFor={`inverted${index / 2}`} className='ml-2 mr-1'>{`Inverted arc`}</label>
                    <input type="checkbox" id={`inverted${index / 2}`} defaultValue="no" onChange={(e) => {
                      setInverted(prev => {
                        const newInverted = [...prev]
                        if (e.target.checked) {
                          newInverted[index / 2] = 1
                        } else { newInverted[index / 2] = 0 }
                        return newInverted
                      })
                    }} />
                    <label htmlFor={`remaining${index / 2}`} className='ml-2 mr-1'>{`Remaining arc`}</label>
                    <input type="checkbox" id={`remaining${index / 2}`} defaultValue="no" onChange={(e) => {
                      setRemaining(prev => {
                        const newRemaining = [...prev]
                        if (e.target.checked) {
                          newRemaining[index / 2] = 1
                        } else { newRemaining[index / 2] = 0 }
                        return newRemaining
                      })
                    }} />
                  </div>
                </Fragment>
              )
            }
          })} */}


          {polygonPoints.map((element, index) => { // radius and the inverted checkbox section for each arc of polygon
            if (polygonPoints.length > 0) {
              let j = 0
              index = polygonPoints.length - (index + 1)
              element = polygonPoints[index]
              return (
                <div key={`polygonArcs: ${index}`} className='border border-red-400 rounded mt-1'>
                  <div className='p-1 flex justify-between'>
                    <span className='underline'>{`Section ${index + 1} - sides ${polysides[index]}`}</span>

                    {(sectionName[index]?.done && !sectionName[index]?.seats) && (
                      <button className='border rounded-2xl pl-2 pr-2 bg-[#1f559b] cursor-pointer' onClick={() => {
                        let newSectionName = [...sectionName]
                        newSectionName[index].seats = []
                        setSectionName(newSectionName)
                      }}>Add Seats</button>
                    )}

                    {sectionName[index]?.seatDone && (
                      <button className='pr-1 pl-1 bg-[#7f1313] rounded cursor-pointer' onClick={() => {
                        let newSectionName = [...sectionName]
                        newSectionName.splice(index, 1)
                        setSectionName(newSectionName)
                        let new_polyPoints = [...polygonPoints]
                        new_polyPoints.splice(index, 1)
                        setpolygonPoints(new_polyPoints)
                        let new_polySides = [...polysides]
                        new_polySides.splice(index, 1)
                        setPolysides(new_polyPoints)
                      }}>Delete Section</button>
                    )}

                  </div>
                  <div>
                    {(sectionName[index]?.seats && !sectionName[index]?.seatDone) && (
                      <div>
                        <div className="flex">
                          <label htmlFor={`row${index}`} className='m-1'>Number of rows</label>
                          <input type="number" min={1} max={100} defaultValue={1} className='border border-white rounded m-1 pl-1' id={`row${index}`} ref={(el) => { seatLayoutRows.current[index] = el }} />
                        </div>

                        <div className="flex">
                          <label htmlFor={`rowNumber${index}`} className='m-1'>Seats in each row</label>
                          <input type="number" min={1} max={100} id={`rowNumber${index}`} defaultValue={1} className='border border-white rounded m-1 pl-1' ref={(el) => { seatLayoutCols.current[index] = el }} />
                        </div>

                        <div className="flex">
                          <label htmlFor="layoutType" className='m-1'>Seats Layout Type</label>
                          <select name="layoutType" id="layoutType" className='border border-white rounded m-1 cursor-pointer' ref={(el) => { seatLayoutType.current[index] = el }}>
                            <option value="linear">Linear</option>
                            <option value="arc">Arc</option>
                          </select>
                        </div>

                        <button className='m-2 pl-2 pr-2 bg-green-900 border border-white rounded-2xl cursor-pointer' onClick={() => {
                          let newSectionName = [...sectionName]
                          newSectionName[index].seats.push({
                            rows: parseInt(seatLayoutRows.current[index].value),
                            columns: parseInt(seatLayoutCols.current[index].value),
                            type: (seatLayoutType.current[index].value),
                            seat_data: {},
                            rowGap: 5,
                            colGap: 5,
                            layoutRadius: 500,
                            seatRadius: 1,
                            angle: 0,
                            groupX: element[0].x,
                            groupY: element[0].y,
                            deletedSeats: []
                          })
                          setSectionName(newSectionName)
                          alert("Press CTRL or SHIFT and then click on seat to delete")
                        }} >Generate Seat Layout</button>

                        {sectionName[index].seats.length > 0 && (
                          <Fragment>
                            <div className='grid grid-cols-2 justify-items-center w-125'>
                              {
                                sectionName[index].seats.map((ele, idx) => {
                                  return (
                                    <div key={idx} className=' m-1 rounded w-fit p-1 bg-[#ffffff12] flex flex-col justify-around border'>
                                      <div className='w-fit underline m-1 mt-0'>{`Seat Layout - ${idx + 1}`}</div>
                                      <div className='w-fit'>
                                        <label htmlFor={`seatRadius${index}`} className='m-1'>Seat Radius</label>
                                        <input type="number" min={0.1} max={50} defaultValue={1} step={0.1} className='border border-white rounded m-1 pl-1' id={`seatRadius${index}`} onChange={(e) => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats[idx].seatRadius = Number(e.target.value)
                                          setSectionName(newSectionName)
                                        }} />
                                      </div>

                                      <div className='w-fit'>
                                        <label htmlFor={`rowGap${index}`} className='m-1'>Row Gap</label>
                                        <input type="number" min={0.1} max={50} step={0.1} defaultValue={5} className='border border-white rounded m-1 pl-1' id={`rowGap${index}`} onChange={(e) => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats[idx].rowGap = Number(e.target.value)
                                          setSectionName(newSectionName)
                                        }} />
                                      </div>

                                      <div className='w-fit'>
                                        <label htmlFor={`colGap${index}`} className='m-1'>Column Gap</label>
                                        <input type="number" min={0.1} max={50} step={0.1} defaultValue={5} className='border border-white rounded m-1 pl-1' id={`colGap${index}`} onChange={(e) => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats[idx].colGap = Number(e.target.value)
                                          setSectionName(newSectionName)
                                        }} />
                                      </div>

                                      <div className='w-fit'>
                                        <label htmlFor={`seatLayoutAngle${index}`} className='m-1'>Layout Angle</label>
                                        <input type="number" min={-180} max={180} defaultValue={0} className='border border-white rounded m-1 pl-1' id={`seatLayoutAngle${index}`} onChange={(e) => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats[idx].angle = Number(e.target.value)
                                          setSectionName(newSectionName)
                                        }} />
                                      </div>

                                      <div className='w-fit'>
                                        <label htmlFor={`groupX${index}`} className='m-1'>Layout X-dist</label>
                                        <input type="number" min={0} max={800} defaultValue={ele.groupX} className='border border-white rounded m-1 pl-1' id={`groupX${index}`} onChange={(e) => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats[idx].groupX = Number(e.target.value)
                                          setSectionName(newSectionName)
                                        }} />
                                      </div>

                                      <div className='w-fit'>
                                        <label htmlFor={`groupY${index}`} className='m-1'>Layout Y-dist</label>
                                        <input type="number" min={0} max={800} defaultValue={ele.groupY} className='border border-white rounded m-1 pl-1' id={`groupY${index}`} onChange={(e) => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats[idx].groupY = Number(e.target.value)
                                          setSectionName(newSectionName)
                                        }} />
                                      </div>

                                      {(ele.type === 'arc') && (
                                        <div className='w-fit'>
                                          <label htmlFor={`layoutRadius${index}`} className='m-1'>Arc Radius</label>
                                          <input type="number" min={1} max={1000} defaultValue={500} className='border border-white rounded m-1 pl-1' id={`layoutRadius${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].layoutRadius = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>
                                      )}
                                      <button className=' bg-[#7f1313] rounded pl-1 pr-1 m-1 cursor-pointer' onClick={() => {
                                        let newSectionName = [...sectionName]
                                        newSectionName[index].seats.splice(idx, 1)
                                        setSectionName(newSectionName)
                                        setEditingSeat(null)
                                        setSelectedSeats(new Set())
                                      }}>Delete Layout</button>

                                    </div>

                                  )
                                })
                              }

                            </div>
                            {/* Delete Button Menu Bar */}


                            {/* Individual Seat Property Editor Panel */}
                            {(editingSeat && editingSeat.secIdx === index) && (
                              <div className="m-2 w-fit border rounded p-1">
                                <h3 className='m-1 ml-0 w-fit underline'>Edit Seat Details</h3>
                                <div className='ml-1 w-fit'>Layout Index: {editingSeat.grpIdx + 1} | Row: {editingSeat.row + 1} | Col: {editingSeat.col + 1}</div>

                                <div className='w-fit'>
                                  <label className='m-1'>Seat Name:</label>
                                  <input type="text" placeholder="e.g. A-12" className='border m-1 border-white rounded pl-1' ref={(el) => { seatNameRef.current[index] = el }} />
                                </div>

                                <div className='w-fit'>
                                  <label className='ml-1'>Price (₹):</label>
                                  <input type="number" min={0} placeholder="e.g. 150" className='border border-white rounded ml-1 pl-1' ref={(el) => { seatPriceRef.current[index] = el }} />
                                </div>

                                <div className='w-fit'>
                                  <label className='m-1'>Tier Category:</label>
                                  <select className='border m-1 border-white rounded' ref={(el) => { seatTierRef.current[index] = el }}>
                                    <option value="none">None</option>
                                    <option value="vip">VIP</option>
                                    <option value="premium">Premium</option>
                                    <option value="standard">Standard</option>
                                  </select>
                                </div>


                                <button onClick={() => {
                                  let newSectionName = [...sectionName]
                                  let seatName = seatNameRef.current[index]?.value.trim() || `row:${editingSeat.row}-col:${editingSeat.col}`
                                  let seatPrice = seatPriceRef.current[index]?.value.trim() || newSectionName[index].price
                                  let seatTier = seatTierRef.current[index]?.value.trim()
                                  newSectionName[index].seats[editingSeat.grpIdx].seat_data[`row${editingSeat.row}-col${editingSeat.col}`] = { seatName, seatPrice, seatTier }
                                  setSectionName(newSectionName)
                                  if (seatPrice) {
                                    setEditingSeat(null)
                                  }
                                }} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-green-900'>Save Details</button>

                                <button onClick={() => setEditingSeat(null)} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-[#765817]'>Cancel</button>
                              </div>
                            )}
                            {selectedSeats.size > 0 && (
                              <Fragment>
                                <span className='m-1'>{selectedSeats.size} seats selected</span>
                                <button onClick={deleteSelectedSeats} className='rounded bg-[#7f1313] pl-1 pr-1 cursor-pointer'>
                                  Delete Selected Seats
                                </button>
                              </Fragment>
                            )}
                            <button className='border rounded-2xl bg-[#183a67] pl-2 pr-2 ml-5 mb-2 cursor-pointer' onClick={() => {
                              let newSectionName = [...sectionName]
                              if (editingSeat?.secIdx === index) {
                                setEditingSeat(null)
                              }
                              newSectionName[index].seatDone = true
                              for (let seat of newSectionName[index].seats) {
                                for (let i = 0; i < seat.rows; i++) {
                                  for (let j = 0; j < seat.columns; j++) {
                                    const key = `row${i}-col${j}`
                                    if (!seat.deletedSeats.includes(key)) {
                                      if (seat.type === 'linear') {
                                        if (seat.seat_data[key]) {
                                          seat.seat_data[key].x = seat.seatRadius * (2 * j + 1) + seat.colGap * j
                                          seat.seat_data[key].y = seat.seatRadius * (2 * i + 1) + seat.rowGap * i
                                        }
                                        else {
                                          seat.seat_data[key] = { x: seat.seatRadius * (2 * j + 1) + seat.colGap * j, y: seat.seatRadius * (2 * i + 1) + seat.rowGap * i, seatName: `Row-${i + 1}|Col-${j + 1}`, seatPrice: newSectionName[index].price, seatTier: "none" }
                                        }
                                      }
                                      else {
                                        let colLength = (2 * seat.rows - 1) * seat.seatRadius + (seat.rows - 1) * seat.rowGap + seat.layoutRadius
                                        let angle = (seat.seatRadius * (2 * j) + seat.colGap * j) / seat.layoutRadius
                                        let sin = Math.sin(angle)
                                        let cos = Math.cos(angle)
                                        if (seat.seat_data[key]) {
                                          seat.seat_data[key].x = (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius
                                          seat.seat_data[key].y = colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos
                                        }
                                        else {
                                          seat.seat_data[key] = { x: (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius, y: colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos, seatName: `row:${i + 1}-col:${j + 1}`, seatPrice: newSectionName[index].price, seatTier: "none" }
                                        }

                                      }
                                    }
                                  }
                                }
                              }
                              setSectionName(newSectionName)
                            }}>Done</button>
                          </Fragment>
                        )}
                      </div>
                    )}
                  </div>

                  {element.map((point, idx) => {
                    if (point.figure === 'arc' && !sectionName[index]?.done) {
                      j++
                      return (
                        <div key={`${idx}`} className="polyarc flex m-auto p-1">
                          <label htmlFor={`radius:${idx}`}>{`Radius: Arc${j}`}</label>
                          <input type="number" id={`radius:${idx}}`} min={1} max={1000} className='border border-amber-100 ml-0.5 rounded pl-0.5' defaultValue='100' onChange={(e) => {
                            setPolyarc(prev => {
                              let newRadii = [...prev];
                              newRadii[index][idx].radius = e.target.value;
                              return newRadii;
                            })
                          }} />
                          <div className={`radius${idx}value`}>{polyarc[index][idx]['radius']}</div>
                          <label htmlFor={`inverted${idx}`} className='ml-2 mr-1'>{`Inverted arc`}</label>
                          <input type="checkbox" id={`inverted${idx}`} defaultValue="no" onChange={(e) => {
                            setPolyarc(prev => {
                              let newInverted = [...prev]
                              if (e.target.checked) {
                                newInverted[index][idx]['inverted'] = 1
                              } else { newInverted[index][idx]['inverted'] = 0 }
                              return newInverted
                            })
                          }} />
                          <label htmlFor={`remaining${idx}`} className='ml-2 mr-1'>{`Remaining arc`}</label>
                          <input type="checkbox" id={`remaining${idx}`} defaultValue="no" onChange={(e) => {
                            setPolyarc(prev => {
                              let newRemaining = [...prev]
                              if (e.target.checked) {
                                newRemaining[index][idx]['remaining'] = 1
                              } else { newRemaining[index][idx]['remaining'] = 0 }
                              return newRemaining
                            })
                          }} />
                        </div>
                      )
                    }
                  })}

                  {!sectionName[index]?.done &&
                    (<div className='m-1'>

                      <label htmlFor='sectionName'>Enter Section Name</label>
                      <input type="text" id='sectionName' ref={(el) => { sectionNameInput.current[index] = el }} className='border border-white rounded ml-1 pl-1' />

                      <button className="cursor-pointer border border-white bg-amber-300 text-white pl-2 pr-2 rounded m-1" onClick={() => {
                        let newSectionName = [...sectionName]
                        newSectionName[index] = { text: sectionNameInput.current[index].value?.trim(), x: element[0].x, y: element[0].y, rotate: 0, font: 10 }
                        console.log(newSectionName[index])
                        setSectionName(newSectionName)
                      }}>Set</button>

                    </div>)
                  }

                  {(sectionName[index]?.text && !sectionName[index]?.done) &&
                    (<div className=' m-1'>
                      <label htmlFor={`section${index}x`}>X-Dist</label>
                      <input type="number" min={0} max={800} defaultValue={sectionName[index].x} className='m-1 border border-white rounded' id={`section${index}x`} onChange={(e) => {
                        let newSectionName = [...sectionName]
                        newSectionName[index].x = e.target.value
                        setSectionName(newSectionName)
                      }} />

                      <label htmlFor={`section${index}y`}>Y-Dist</label>
                      <input type="number" min={0} max={800} defaultValue={sectionName[index].y} className='m-1 border border-white rounded' id={`section${index}y`} onChange={(e) => {
                        let newSectionName = [...sectionName]
                        newSectionName[index].y = e.target.value
                        setSectionName(newSectionName)
                      }} />

                      <label htmlFor={`section${index}rotate`}>Angle</label>
                      <input type="number" min={-180} max={180} defaultValue={sectionName[index].rotate} className='m-1 border border-white rounded' id={`section${index}rotate`} onChange={(e) => {
                        let newSectionName = [...sectionName]
                        newSectionName[index].rotate = e.target.value
                        setSectionName(newSectionName)
                      }} />

                      <label htmlFor={`section${index}font`}>Font</label>
                      <input type="number" min={1} max={30} defaultValue={sectionName[index].font} className='m-1 border border-white rounded' id={`section${index}font`} onChange={(e) => {
                        let newSectionName = [...sectionName]
                        newSectionName[index].font = e.target.value
                        setSectionName(newSectionName)
                      }} />

                      <div>
                        <label htmlFor={`section${index}price`}>Enter Section Price (₹)</label>
                        <input type="number" min={0} id={`section${index}price`} ref={(el) => { sectionPriceInput.current[index] = el }} className='border border-white rounded m-1 pl-1' />
                      </div>

                      <div>
                        <label htmlFor={`section${index}color`}>Enter Section Color</label>
                        <input type="color" id={`section${index}color`} className='border border-white rounded m-1 pl-1' onChange={(e) => {
                          let newSectionName = [...sectionName]
                          newSectionName[index].color = e.target.value
                          setSectionName(newSectionName)
                        }} />
                      </div>

                      <button className='pl-2 pr-2 m-2 block border border-white rounded-2xl bg-red-900 cursor-pointer' onClick={() => {
                        let newSectionName = [...sectionName]
                        newSectionName[index].done = true
                        newSectionName[index].price = (sectionPriceInput.current[index].value.trim())
                        setSectionName(newSectionName)
                      }}>Done</button>
                    </div>)
                  }

                </div>
              )
            }
          })}

        </div>

        <div className="seat_canvas mb-auto ml-auto mr-auto mt-2 overflow-hidden border-2 border-amber-500" onContextMenu={(e) => { e.preventDefault() }}>
          <svg ref={sceneRef} id="svg_canvas" className='cursor-pointer border border-white opacity-50 w-[800px] h-[800px] p-0 mb-auto ml-auto mr-auto' onMouseDown={handleGridMouseDown} onMouseMove={handleGridMouseMove} onMouseUp={handleGridMouseUp} >
            <g>
              <image href={Image} x={0} y={0} width='100%' height='100%' pointerEvents='none'></image>
              <g>
                {Array.from({ length: rows - 1 }, (element, index) => {
                  return (
                    <path key={`row:${index}`} d={`M0 ${(index + 1) * 800 / rows} H800`} stroke='white' strokeOpacity={0.5} strokeWidth={0.5} fill='none' pointerEvents='none'></path>
                  )
                })}
                {Array.from({ length: columns - 1 }, (element, index) => {
                  return (
                    <path key={`col:${index}`} d={`M${(index + 1) * 800 / columns} 0 V800`} stroke='white' strokeOpacity={0.5} strokeWidth={0.5} fill='none' pointerEvents='none'></path>
                  )
                })}
              </g>

              <g fill="none">
                {arcPoints.map((element, index) => {
                  if (((index + 2) <= arcPoints.length && index % 2 === 0) && arcPoints.length > 0) {
                    return (
                      <path key={index} d={`M${arcPoints[(index)][0]} ${arcPoints[(index)][1]} A${radius[index / 2]} ${radius[index / 2]} 0 ${remaining[index / 2]} ${inverted[index / 2]} ${arcPoints[1 + index][0]} ${arcPoints[1 + index][1]}`} stroke='red' strokeWidth={0.2} pointerEvents='none'></path>
                    )
                  }
                })}
              </g>
              <g>
                {linePoints.map((element, index) => {
                  if (((index + 2) <= linePoints.length && index % 2 === 0) && linePoints.length > 0) {
                    return (
                      <path key={index} d={`M${linePoints[(index)][0]} ${linePoints[(index)][1]} L${linePoints[1 + index][0]} ${linePoints[1 + index][1]}`} stroke='red' strokeWidth={0.5} pointerEvents='none'></path>
                    )
                  }
                })}
              </g>
              <g>
                {tempPolygon.map((element, index) => {
                  return (
                    <circle
                      cx={element.x}
                      cy={element.y}
                      r={1}
                      fill={'red'}
                      strokeWidth={0}
                      key={index}
                    />
                  )
                })}
              </g>
              {polygonPoints.map((element, index) => {
                if (polygonPoints.length > 0) {
                  let d = `M${element[0]['x']} ${element[0]['y']} `

                  for (let i = 1; i < polysides[index]; i++) {
                    let radius = polyarc[index][i]?.radius ? polyarc[index][i].radius : 100
                    let remaining = polyarc[index][i]?.remaining ? polyarc[index][i].remaining : 0
                    let inverted = polyarc[index][i]?.inverted ? polyarc[index][i].inverted : 0
                    if (element[i].figure === 'line') {
                      d += `L${element[i]['x']} ${element[i]['y']} `
                    } else {
                      d += `A${radius} ${radius} 0 ${remaining} ${inverted} ${element[i]['x']} ${element[i]['y']} `
                    }
                  }
                  let rotationAngle = sectionName[index]?.rotate ? sectionName[index].rotate : 0
                  let text = sectionName[index]?.text ? sectionName[index].text : ''
                  let font = sectionName[index]?.font ? sectionName[index].font : 10
                  let textX = sectionName[index]?.x ? sectionName[index].x : element[0].x
                  let textY = sectionName[index]?.y ? sectionName[index].y : element[0].y
                  let color = sectionName[index]?.color ? sectionName[index].color : 'pink'

                  if (element[0].figure === 'arc') {
                    d += `A${polyarc[index][0].radius} ${polyarc[index][0].radius} 0 ${polyarc[index][i].remaining} ${polyarc[index][0].inverted} ${element[0]['x']} ${element[0]['y']} `
                  }
                  else { d += 'Z' }
                  return (
                    <Fragment key={index} >
                      <g onClick={(e) => { handleSectionClick(e, textX, textY) }}>
                        <path d={d} stroke='red' strokeWidth={0.2} fillOpacity='0.5' fill={color} ></path>
                        <text x={textX} y={textY} textAnchor='middle' pointerEvents={'none'} dominantBaseline='central' fontSize={font} transform={`rotate(${rotationAngle},${textX},${textY})`} fill='white'>{text}</text>
                      </g>
                      {sectionName[index]?.seats?.length > 0 && (
                        <Fragment>
                          {sectionName[index].seats.map((ele, idx) => {
                            let rows = ele.rows
                            let columns = ele.columns
                            let posX = ele.groupX
                            let posY = ele.groupY
                            let seatRadius = ele.seatRadius || 1
                            let layoutRadius = ele.layoutRadius || 100
                            let rotationAngle = ele.angle || 0
                            let rowGap = ele.rowGap || 10
                            let colGap = ele.colGap || 10
                            let type = ele.type
                            let colLength = (2 * rows - 1) * seatRadius + (rows - 1) * rowGap + layoutRadius
                            return (
                              <g
                                key={idx}
                                transform={`translate(${posX},${posY}) rotate(${rotationAngle})`}
                                onClick={(e) => { handleSeatClick(e, idx, index); console.log("clicked", e.target.closest("circle")) }} // Delegated click handler passing group index
                                style={{ cursor: 'pointer' }}
                              >
                                {Array.from({ length: columns }).map((col, col_idx) => {
                                  return (
                                    <Fragment key={`col${col_idx}`}>
                                      {Array.from({ length: rows }).map((row, row_idx) => {
                                        // Unique signature identifier for this specific seat item
                                        const uniqueSeatKey = `${index}_${idx}_${col_idx}_${row_idx}`;
                                        const isSelected = selectedSeats?.has(uniqueSeatKey);
                                        const isEditing = editingSeat?.seatKey === uniqueSeatKey

                                        // Setting the seat color according to the user want to edit it or delete
                                        let fillColor
                                        if (isSelected) {
                                          fillColor = '#ff4d4f'
                                        } else if (isEditing) {
                                          fillColor = '#1DB954'
                                        } else if (ele.seat_data[`row${row_idx}-col${col_idx}`]?.seatName && (ele.seat_data[`row${row_idx}-col${col_idx}`]?.seatName !== `Row-${row_idx + 1}|Col-${col_idx + 1}`)) {
                                          fillColor = '#FFAC1C'
                                        } else {
                                          fillColor = '#1890ff'
                                        }

                                        // Skip rendering completely if this seat metadata was deleted in backend/state
                                        if (ele.deletedSeats?.includes(`row${row_idx}-col${col_idx}`)) return null;

                                        if (type === 'linear') {
                                          let x = seatRadius * (2 * col_idx + 1) + colGap * col_idx
                                          let y = seatRadius * (2 * row_idx + 1) + rowGap * row_idx

                                          return (
                                            <circle
                                              cx={x}
                                              cy={y}
                                              r={seatRadius}
                                              fill={fillColor} // Turns red if selected for multi-delete
                                              strokeWidth={0}
                                              key={`row${row_idx}`}
                                              data-row={row_idx}
                                              data-col={col_idx}
                                              data-section={sectionName[index].text}
                                            />
                                          )
                                        } else {
                                          let angle = (seatRadius * (2 * col_idx) + colGap * col_idx) / layoutRadius
                                          let sin = Math.sin(angle)
                                          let cos = Math.cos(angle)
                                          let x = (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx)) * sin + seatRadius
                                          let y = colLength - (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx)) * cos

                                          return (
                                            <circle
                                              cx={x}
                                              cy={y}
                                              r={seatRadius}
                                              fill={fillColor}
                                              strokeWidth={0}
                                              key={row_idx}
                                              data-row={row_idx}
                                              data-col={col_idx}
                                              data-section={sectionName[index].text}
                                            />
                                          )

                                        }
                                      })}
                                    </Fragment>
                                  )
                                })}
                              </g>
                            )
                          })}
                        </Fragment>
                      )}
                    </Fragment>
                  )
                }
              })}
            </g>
          </svg>
        </div>

        {sectionName[0]?.done && (
          <div>
            <Link to='/' className='border border-white bg-[#2c662c] pl-1 pr-1 rounded cursor-pointer' onClick={saveSeatLayout}>Save</Link>
          </div>
        )}

      </div>
    </>
  )
}

export default LayoutCreate
