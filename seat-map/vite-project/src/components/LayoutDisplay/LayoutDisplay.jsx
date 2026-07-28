import { useEffect, useRef, useState, Fragment } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import panzoom from 'panzoom'
import layout from './layout.json'

function LayoutDisplay({ setDisplayLayout, formData, venueId }) {
  const [seatLayout, setseatLayout] = useState({})
  const [addPrice, setAddPrice] = useState({})
  const [editingSeat, setEditingSeat] = useState(null)
  const [hoveredSeat, setHoveredSeat] = useState(null)
  const [doneSeats, setDoneSeats] = useState([])
  const [pricedSections, setPricedSections] = useState([])
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const seatPriceRef = useRef({})
  const sectionPriceRef = useRef({})
  const sceneRef = useRef(null)
  const panzoomInstance = useRef(null)
  const rows = 50
  const columns = 50
  const width = 800


  useEffect(() => {
    if (sceneRef.current) {

      panzoomInstance.current = panzoom(sceneRef.current, {
        maxZoom: 40,
        minZoom: 1,
        zoomSpeed: 0.065,
        bounds: true,
        boundsPadding: 1,

      });

      panzoomInstance.current.on('transform', (e) => {
        const currentTransform = e.getTransform();
        if (JSON.stringify(currentTransform) !== JSON.stringify(transform)) {
          setTransform({
            x: currentTransform.x,
            y: currentTransform.y,
            scale: currentTransform.scale
          });
        }
      });
    }

    // CRITICAL: Clean up event listeners when the component unmounts
    return () => {
      if (panzoomInstance.current) {
        panzoomInstance.current.dispose();
      }
    };
  }, []);


  useEffect(() => {
    (async function getVenue() {
      const URL = `http://localhost:5000/api/events/venue/${venueId}`
      const response = await axios.get(URL)
      // console.log(response.data)
      let layout = response.data.venue.seatLayout
      Object.entries(layout).map(([section_key, section]) => {
        if (section_key.startsWith('section')) {
          delete layout[section_key].price
          Object.entries(layout[section_key].seats).map(([layout_key, layout_val]) => {
            Object.entries(layout_val.seat_data).map(([seat_key, seat]) => {
              delete (layout[section_key].seats[layout_key].seat_data[seat_key].seatPrice)
            })
          })
        }
      })
      console.log({ Layout2: layout })
      setseatLayout(layout)
      // const Layout = layout
      // setseatLayout(layout)

    })()
  }, [])


  const saveSeatLayout = async () => {
    
    let layout = {...seatLayout}
    Object.entries(layout).map(([section_key, section]) => {
      if (section_key.startsWith('section')) {
        if(!section.price){
          alert(`Please Enter Prices of all section especially Section-${section.name}`)
          return
        }
        Object.entries(layout[section_key].seats).map(([layout_key, layout_val]) => {
          Object.entries(layout_val.seat_data).map(([seat_key, seat]) => {
            if(!layout[section_key].seats[layout_key].seat_data[seat_key].seatPrice){
              layout[section_key].seats[layout_key].seat_data[seat_key].seatPrice = layout[section_key].price
            }
          })
        })
      }
    })
    const data = { ...formData, seatLayout : layout }
    console.log(data)
    await axios.post('http://localhost:5000/api/events', data)
    alert('Saved')
    const navigate = useNavigate('/')
    setDisplayLayout('none')
  }

  const handleSeatClick = (e) => {
    console.log(e.target)
    const seat = e.target.closest('circle')
    if (!seat) {
      console.log('no seat')
      return;
    }

    let seatDetail = JSON.parse(seat.dataset.key)

    if (JSON.stringify(editingSeat) === JSON.stringify(seatDetail)) {
      setEditingSeat(null)
    } else {
      setEditingSeat(seatDetail);
    }
  }

  const handleSeatHover = (e) => {
    const seat = e.target.closest('circle')
    if (!seat) {
      setHoveredSeat({})
      return;
    }
    let seatDetail = JSON.parse(seat.dataset.key)

    if (hoveredSeat != seatDetail) {
      setHoveredSeat(seatDetail)
    }
  }

  return (
    <div className='flex'>
      <div className='w-120'>
        {Object.entries(seatLayout).map(([index, value]) => { // radius and the inverted checkbox section for each arc of polygon
          if (index.startsWith('section')) {
            return (
              <div key={`polygonArcs: ${index}`} className='border border-[#787877] rounded mt-1'>
                <div className='p-1 flex justify-between'>
                  <span className='underline'>{`Section-${value.name}`}</span>
                  {!pricedSections.includes(index) ? (
                    <button className='border rounded-2xl pl-2 pr-2 bg-[#1f559b] cursor-pointer' onClick={() => {
                      let newAddPrice = { ...addPrice }
                      newAddPrice[index] = true
                      setAddPrice(newAddPrice)
                    }}>Add Price</button>

                  ) : (

                    <button className='border rounded-2xl pl-2 pr-2 bg-[#89410d] cursor-pointer' onClick={() => {
                      let newAddPrice = { ...addPrice }
                      newAddPrice[index] = true
                      setAddPrice(newAddPrice)
                    }}>Edit Price</button>
                  )
                  }
                </div>
                {addPrice[index] && (
                  <Fragment>
                    <div>
                      <label htmlFor='sectionPrice' className='m-1'>Enter Section Price (₹)</label>
                      <input type="Number" min={0} placeholder='e.g. 150' id='sectionPrice' defaultValue={pricedSections.includes(index) ? value.price : ''} className='border border-white rounded m-1 pl-1' ref={(el) => { sectionPriceRef.current[index] = el }} />
                    </div>
                    <button className='pl-2 pr-2 m-2 block border border-white rounded-2xl bg-red-900 cursor-pointer' onClick={() => {
                      let newSeatLayout = { ...seatLayout }
                      newSeatLayout[index].price = sectionPriceRef.current[index].value
                      setseatLayout(newSeatLayout)
                      setAddPrice((prev) => {
                        let newAddPrice = { ...prev }
                        newAddPrice[index] = false
                        return newAddPrice
                      })
                      setPricedSections([...pricedSections, index])
                    }}>Done</button>
                  </Fragment>
                )}


                {(editingSeat && editingSeat.sectionKey === index) && (
                  <div>
                    <div className="m-2 w-fit border rounded p-1">
                      <h3 className='m-1 ml-0 w-fit underline'>Seat Details</h3>
                      <div className='ml-1 w-fit'>Layout Index: {editingSeat.layoutKey}</div>

                      <div className='w-fit'>
                        <label className='m-1'>Seat Name:</label>
                        <input type="text" placeholder="e.g. A-12" className='border m-1 border-white rounded pl-1' value={seatLayout[editingSeat.sectionKey].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatName ?? ''} />
                      </div>

                      <div className='w-fit'>
                        <label className='ml-1'>Price (₹):</label>
                        <input type="number" min={0} placeholder="e.g. 150" defaultValue={doneSeats.includes(JSON.stringify(editingSeat)) ? value.seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatPrice : ''} className='border border-white rounded ml-1 pl-1' ref={(el) => { seatPriceRef.current[editingSeat.seatKey] = el }} />
                      </div>

                      <div className='w-fit'>
                        <label className='m-1'>Tier Category:</label>
                        <select className='border m-1 border-white rounded' value={value.seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatTier || 'none'} readOnly>
                          <option value="premium">Premium</option>
                          <option value="vip">VIP</option>
                          <option value="standard">Standard</option>
                          <option value="none">None</option>
                        </select>
                      </div>


                      <button onClick={() => {
                        let newSeatLayout = { ...seatLayout }
                        newSeatLayout[index].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatPrice = seatPriceRef.current[editingSeat.seatKey]?.value.trim()
                        setseatLayout(newSeatLayout)
                        console.log(newSeatLayout[index].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey])
                        let newDoneSeats = [...doneSeats]
                        newDoneSeats.push(JSON.stringify(editingSeat))
                        setDoneSeats(newDoneSeats)
                        setEditingSeat(null)
                      }} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-green-900'>Save Details</button>

                      <button onClick={() => setEditingSeat(null)} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-[#765817]'>Cancel</button>
                    </div>

                  </div>
                )}
              </div>
            )
          }
        })}
      </div>

      <div className="seat_canvas mb-auto ml-auto mr-auto mt-2 overflow-hidden border-2 border-amber-500 w-[800px]" onContextMenu={(e) => { e.preventDefault() }} >
        <svg ref={sceneRef} id="svg_canvas" className='cursor-pointer border border-white opacity-50 p-0 mb-auto ml-auto mr-auto' viewBox='0 0 800 800' >
          <g>
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
            <g
              onClick={handleSeatClick}
            >
              {Object.entries(seatLayout).map(([section_key, section_val]) => {
                if (section_key.startsWith('display')) {

                  let d = section_val?.d
                  let rotationAngle = section_val?.textAngle ? section_val.textAngle : 0
                  let text = section_val?.name ? section_val.name : ''
                  let color = section_val?.color ? section_val.color : 'pink'
                  let font = section_val?.textFont ? section_val.textFont : 10
                  let textX = section_val?.textX
                  let textY = section_val?.textY
                  let opacity = 0

                  return (
                    <Fragment key={section_key} >
                      <g>
                        <path d={d} stroke='none' fill={color} fillOpacity={0.4} ></path>
                        <text x={textX} y={textY} textAnchor='middle' pointerEvents={'none'} dominantBaseline='central' fontSize={font} transform={`rotate(${rotationAngle},${textX},${textY})`} fill='white' opacity={1 - opacity + 0.2}>{text}</text>
                      </g>
                    </Fragment>
                  )
                }
              })}

              {Object.entries(seatLayout).map(([section_key, section_val]) => {
                if (section_key.startsWith('section')) {
                  let d = section_val?.d
                  let rotationAngle = section_val?.textAngle ? section_val.textAngle : 0
                  let text = section_val?.name ? section_val.name : ''
                  let color = section_val?.color ? section_val.color : 'pink'
                  let font = section_val?.textFont ? section_val.textFont : 10
                  let textX = section_val?.textX
                  let textY = section_val?.textY
                  let displayOnly = section_key.startsWith('display')
                  let radius = !displayOnly ? Object.entries(section_val?.seats)[0][1].seatRadius : 1
                  const scaleThreshold = 4 / radius || 1
                  const opacityThreshold = 2 / radius || 1
                  let opacity = 0
                  let displayseats = false
                  let width = 800

                  if (transform.scale > opacityThreshold && !displayOnly) {

                    // Frustum Culling Part (it's just rendening only the seats of the sections that are present near the zoomed part)
                    let x = transform.x * -1 / transform.scale + width / (transform.scale * 2)
                    let y = transform.y * -1 / transform.scale + width / (transform.scale * 2)
                    let threshold = width / transform.scale + width / 10
                    let minX = width
                    let maxX = 0
                    let minY = width
                    let maxY = 0
                    for (let point of Object.values(section_val.points)) {
                      let pointx = (point.x * width) / 800
                      let pointy = (point.y * width) / 800
                      if ((Math.abs(pointx - x) <= threshold) && (Math.abs(pointy - y) <= threshold)) {
                        displayseats = true
                        if (transform.scale > scaleThreshold) {
                          opacity = 1
                        } else {
                          opacity = (transform.scale - opacityThreshold) / (scaleThreshold - opacityThreshold)
                        }
                      }

                      if (pointx > maxX) {
                        maxX = pointx
                      }
                      if (pointy > maxY) {
                        maxY = pointy
                      }
                      if (pointx < minX) {
                        minX = pointx
                      }
                      if (point.y < minY) {
                        minY = pointy
                      }
                    }
                    if ((x > minX && x < maxX) && (y > minY && y < maxY)) {
                      displayseats = true
                      if (transform.scale > scaleThreshold) {
                        opacity = 1
                      } else {
                        opacity = (transform.scale - opacityThreshold) / (scaleThreshold - opacityThreshold)
                      }
                    }
                  }

                  return (
                    <Fragment key={section_key} >
                      <g>
                        <path d={d} stroke='none' fill={color} fillOpacity={displayOnly ? 0.4 : (1 - opacity + 0.2)} ></path>
                        <text x={textX} y={textY} textAnchor='middle' pointerEvents={'none'} dominantBaseline='central' fontSize={font} transform={`rotate(${rotationAngle},${textX},${textY})`} fill='white' opacity={1 - opacity + 0.2}>{text}</text>
                      </g>
                      {displayseats && (
                        <Fragment>
                          {Object.entries(section_val?.seats).map(([layout_key, layout_val]) => {
                            return (
                              <g
                                key={layout_key}
                                transform={`translate(${layout_val.groupX},${layout_val.groupY}) rotate(${layout_val.angle})`}
                                className='cursor-pointer'
                              >
                                {Object.entries(layout_val.seat_data).map(([seat_key, seat_val]) => {
                                  const seatDetail = { seatKey: seat_key, sectionKey: section_key, layoutKey: layout_key }
                                  const isSelected = editingSeat ? (JSON.stringify(editingSeat) === JSON.stringify(seatDetail)) : false
                                  const isHovered = hoveredSeat ? (JSON.stringify(seatDetail) === JSON.stringify(hoveredSeat)) : false
                                  const isDone = doneSeats.includes(JSON.stringify({ sectionKey: section_key, layoutKey: layout_key, seatKey: seat_key }))
                                  // Setting the seat color according to the user want to edit it or delete
                                  let fillColor
                                  if (isSelected) {
                                    fillColor = '#1DB954'// 
                                  } else if (isDone) {
                                    fillColor = '#FFAC1C'
                                  } else {
                                    fillColor = '#1890ff'
                                  }

                                  return (
                                    <g
                                      key={seat_key}
                                      onMouseEnter={handleSeatHover}
                                      onMouseLeave={() => { setHoveredSeat(null) }}
                                      onClick={() => { console.log('seatClciked') }}
                                    >
                                      <circle
                                        cx={seat_val.x}
                                        cy={seat_val.y}
                                        r={layout_val.seatRadius}
                                        fill={fillColor}
                                        strokeWidth={0}
                                        opacity={opacity}
                                        data-key={JSON.stringify(seatDetail)}
                                        key={seat_key}
                                      />
                                    </g>
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
          </g>
        </svg >
      </div >

      <div>
        <button className='border border-white bg-[#2c662c] pl-1 pr-1 rounded cursor-pointer' onClick={saveSeatLayout}>Save</button>
      </div>
    </div >
  )
}

export default LayoutDisplay
