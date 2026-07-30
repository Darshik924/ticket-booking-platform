"use client";

import { useEffect, useRef, useState, Fragment, type MouseEvent } from 'react'
import panzoom from 'panzoom'
import layout from './layout.json'
import {
  SofaIcon,
  MapPin,
  CalendarDays,
  ShieldCheck,
  House,
  ArrowRightIcon
} from 'lucide-react'

type SeatData = {
  seatName?: string
  seatPrice?: number | string
  seatTier?: string
  [key: string]: unknown
}

type SeatPoint = {
  x: number | string
  y: number | string
  [key: string]: unknown
}

type SeatLayout = {
  x: number | string
  y: number | string
  [key: string]: unknown
}

type Section = {
  d?: string
  textAngle?: number | string
  name?: string
  color?: string
  textFont?: number | string
  price?: string | number
  textX?: number | string
  textY?: number | string
  points?: Record<string, SeatPoint>
  seats?: Record<
    string,
    {
      groupX: number | string
      groupY: number | string
      angle: number | string
      seatRadius: number | string
      seat_data: Record<string, SeatData & SeatLayout>
      [key: string]: unknown
    }
  >
  [key: string]: unknown
}

type SeatLayoutMap = Record<string, Section>

type SeatReference = {
  seatKey: string
  sectionKey: string
  layoutKey: string
}

type Transform = {
  x: number
  y: number
  scale: number
}

function UserDisplay() {
  const [seatLayout, setseatLayout] = useState<SeatLayoutMap>(layout as SeatLayoutMap)
  const [selectedSeat, setSelectedSeat] = useState<string[]>([])
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  })
  const [GridMouseDown, setGridMouseDown] = useState(false)

  const sceneRef = useRef<SVGSVGElement | null>(null)
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const panzoomInstance = useRef<ReturnType<typeof panzoom> | null>(null)

  const width =
    typeof window !== 'undefined'
      ? Math.max(window.innerHeight * 0.80, 350)
      : 560

  useEffect(() => {
    if (!sceneRef.current) return

    panzoomInstance.current = panzoom(sceneRef.current, {
      maxZoom: 40,
      minZoom: 1,
      zoomSpeed: 0.065,
      bounds: true,
      boundsPadding: 1,
    })

    panzoomInstance.current.on('transform', (e: { getTransform: () => Transform }) => {
      const currentTransform = e.getTransform()

      setTransform({
        x: currentTransform.x,
        y: currentTransform.y,
        scale: currentTransform.scale,
      })
    })

    return () => {
      if (panzoomInstance.current) {
        panzoomInstance.current.dispose()
      }
    }
  }, [])

  useEffect(() => {
    setseatLayout(layout as SeatLayoutMap)
  }, [])

  const handleSectionClick = (
    _event: MouseEvent<SVGGElement>,
    textX: number | undefined,
    textY: number | undefined,
    targetScale: number
  ) => {
    const panzoom = panzoomInstance.current

    if (!panzoom) return

    const svg = sceneRef.current

    const point = svg.createSVGPoint()

    point.x = ((textX ?? 0) / 800) * width
    point.y = ((textY ?? 0) / 800) * width

    const screenCTM = svg.getScreenCTM()
    if (!screenCTM) return

    const svgCoords = point.matrixTransform(screenCTM.inverse())

    const centerX = svgCoords.x
    const centerY = svgCoords.y

    if (
      panzoom.getTransform().scale <
      targetScale
    ) {
      panzoom.smoothZoomAbs(
        centerX,
        centerY,
        targetScale
      )
    }
  }

  const handleSeatHover = (e: MouseEvent<SVGGElement>) => {
    const target = e.target
    const seat = target instanceof Element ? target.closest('circle') : null

    if (!seat) {
      setHoveredSeat(null)
      return
    }

    const seatDetail = seat.dataset.key as string

    if (hoveredSeat !== seatDetail) {
      setHoveredSeat(seatDetail)
    }
  }

  const handleSeatClick = (e: MouseEvent<SVGGElement>) => {
    const target = e.target
    const seat = target instanceof Element ? target.closest('circle') : null

    if (!seat) return

    const seatDetail = seat.dataset.key as string

    if (selectedSeat.includes(seatDetail)) {
      const newSelectedSeat = [...selectedSeat]

      const index =
        newSelectedSeat.indexOf(seatDetail)

      newSelectedSeat.splice(index, 1)

      setSelectedSeat(newSelectedSeat)
    } else if (selectedSeat.length < 10) {
      setSelectedSeat([
        ...selectedSeat,
        seatDetail,
      ])
    } else {
      alert(
        'You have already selected enough number of seats'
      )
    }
  }

  const resetDisplay = () => {
    if (!panzoomInstance.current) return

    panzoomInstance.current.zoomAbs(0, 0, 1)
  }

  const zoomIn = () => {
    if (!panzoomInstance.current) return

    const current =
      panzoomInstance.current.getTransform()

    panzoomInstance.current.smoothZoomAbs(
      width / 2,
      width / 2,
      Math.min(current.scale * 1.3, 40)
    )
  }

  const zoomOut = () => {
    if (!panzoomInstance.current) return

    const current =
      panzoomInstance.current.getTransform()

    panzoomInstance.current.smoothZoomAbs(
      width / 2,
      width / 2,
      Math.max(current.scale / 1.3, 1)
    )
  }

  const getTotalPrice = () => {
    let price = 0

    for (const selected of selectedSeat) {
      const seat: SeatReference = JSON.parse(selected)

      const seatData =
        seatLayout?.[seat.sectionKey]
          ?.seats?.[seat.layoutKey]
          ?.seat_data?.[seat.seatKey]

      price += Number(
        seatData?.seatPrice || 0
      )
    }

    return price
  }

  const removeSeat = (index: number) => {
    const newSelectedSeat = [...selectedSeat]

    newSelectedSeat.splice(index, 1)

    setSelectedSeat(newSelectedSeat)
  }

  const getSeatData = (selected: string) => {
    const seat: SeatReference = JSON.parse(selected)

    return {
      seat,
      data:
        seatLayout?.[seat.sectionKey]
          ?.seats?.[seat.layoutKey]
          ?.seat_data?.[seat.seatKey],
      section:
        seatLayout?.[seat.sectionKey],
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-[#111827] lg:h-screen lg:overflow-hidden">
      <header className="relative z-30 border-b border-[#E7E9F0] bg-white">
        <div className="h-[82px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-[0_7px_20px_rgba(99,102,241,0.22)] sm:h-11 sm:w-11">
                <span className="text-lg">🎟️</span>
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6366F1] sm:text-[10px]">
                    Select seats
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-[#CBD5E1] sm:block" />
                  <span className="hidden text-[10px] font-medium text-[#94A3B8] sm:block">
                    Secure booking
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[10px] font-bold tracking-[-0.025em] text-[#111827] sm:text-[20px]">
                  Event Name
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <MapPin
                      size={12}
                      strokeWidth={2}
                      className="shrink-0 text-[#6366F1]"
                    />
                    <span className="max-w-[130px] truncate text-[10px] font-medium text-[#64748B] sm:max-w-[220px] sm:text-[11px]">
                      Venue Name
                    </span>
                  </div>
                  <span className="text-[#CBD5E1]">•</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <CalendarDays
                      size={12}
                      strokeWidth={2}
                      className="text-[#6366F1]"
                    />
                    <span className="whitespace-nowrap text-[10px] font-medium text-[#64748B] sm:text-[11px]">
                      Start Date
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-4 sm:flex">
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
                  Seats selected
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#111827]">
                  {selectedSeat.length}
                  <span className="font-medium text-[#A0A6B2]"> / 10</span>
                </p>
              </div>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E9EAF2] sm:w-24">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      selectedSeat.length * 10,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="lg:flex lg:h-[calc(100vh-82px)] lg:min-h-0">
        <section className="relative min-w-0 flex-1 overflow-hidden bg-[#F6F7FB]">
          <div className="pointer-events-none absolute left-[25%] top-[20%] h-[300px] w-[300px] rounded-full bg-indigo-200/20 blur-[90px] sm:h-[420px] sm:w-[420px]" />
          <div className="pointer-events-none absolute bottom-[10%] right-[10%] h-[220px] w-[220px] rounded-full bg-violet-200/20 blur-[80px] sm:h-[300px] sm:w-[300px]" />

          <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_10px_35px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:right-5 sm:top-5 lg:right-6 lg:top-6">
            <button
              onClick={zoomIn}
              className="flex h-10 w-10 cursor-pointer items-center justify-center border-b border-[#EEF0F5] text-lg font-light text-[#475569] transition hover:bg-[#F6F7FF] hover:text-[#6366F1] sm:h-11 sm:w-11"
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className="flex h-10 w-10 cursor-pointer items-center justify-center border-b border-[#EEF0F5] text-lg font-light text-[#475569] transition hover:bg-[#F6F7FF] hover:text-[#6366F1] sm:h-11 sm:w-11"
            >
              −
            </button>
            <button
              onClick={resetDisplay}
              title="Reset view"
              className="flex h-10 w-10 cursor-pointer items-center justify-center text-xs font-bold text-[#64748B] transition hover:bg-[#F6F7FF] hover:text-[#6366F1] sm:h-11 sm:w-11"
            >
              <House size={15} />
            </button>
          </div>

          <div className="flex h-full w-full items-center justify-center overflow-hidden px-3 pb-24 pt-20 sm:px-5 sm:pb-28 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-8">
            <div
              ref={layoutRef}
              className="seat_canvas relative aspect-square w-full max-w-[min(78vh,calc(100vw-32px))] bg-transparent sm:max-w-[min(76vh,calc(100vw-48px))] lg:max-w-[min(78vh,calc(100% - 40px))]"
              onContextMenu={(e) => {
                e.preventDefault()
              }}
            >
              <svg
                ref={sceneRef}
                id="svg_canvas"
                className="z-[-1] cursor-grab p-0 mb-auto ml-auto mr-auto"
                style={{
                  cursor: GridMouseDown
                    ? 'grabbing'
                    : 'grab',
                }}
                onMouseDown={() => {
                  setGridMouseDown(true)
                }}
                onMouseUp={() => {
                  setGridMouseDown(false)
                }}
                viewBox="0 0 800 800"
              >
                <g onClick={handleSeatClick}>
                  {seatLayout &&
                    Object.entries(
                      seatLayout
                    ).map(
                      ([
                        section_key,
                        section_val,
                      ]) => {
                        const d = section_val?.d
                        const rotationAngle =
                          section_val?.textAngle
                            ? section_val.textAngle
                            : 0
                        const text =
                          section_val?.name
                            ? section_val.name
                            : ''
                        const color =
                          section_val?.color
                            ? section_val.color
                            : 'pink'
                        const font =
                          section_val?.textFont
                            ? section_val.textFont
                            : 10
                        const textX =
                          section_val?.textX
                        const textY =
                          section_val?.textY
                        const displayOnly =
                          section_key.startsWith(
                            'displayOnly'
                          )

                        if (displayOnly) {
                          return (
                            <Fragment
                              key={section_key}
                            >
                              <g>
                                <path
                                  d={d}
                                  stroke="none"
                                  fill={color}
                                  fillOpacity={0.4}
                                />
                                <text
                                  x={textX}
                                  y={textY}
                                  textAnchor="middle"
                                  pointerEvents="none"
                                  dominantBaseline="central"
                                  fontSize={font}
                                  transform={`rotate(${rotationAngle},${textX},${textY})`}
                                  fill="white"
                                  opacity={1}
                                >
                                  {text}
                                </text>
                              </g>

                            </Fragment>
                          )
                        } else {
                          return null
                        }
                      }
                    )}
                </g>
                <g onClick={handleSeatClick}>
                  {seatLayout &&
                    Object.entries(
                      seatLayout
                    ).map(
                      ([
                        section_key,
                        section_val,
                      ]) => {
                        const d = section_val?.d
                        const rotationAngle =
                          section_val?.textAngle
                            ? section_val.textAngle
                            : 0
                        const text =
                          section_val?.name
                            ? section_val.name
                            : ''
                        const color =
                          section_val?.color
                            ? section_val.color
                            : 'pink'
                        const font =
                          section_val?.textFont
                            ? section_val.textFont
                            : 10
                        const textX =
                          section_val?.textX
                        const textY =
                          section_val?.textY
                        const displayOnly =
                          section_key.startsWith(
                            'displayOnly'
                          )
                        const radius = !displayOnly
                          ? Object.entries(
                            section_val?.seats
                          )[0][1].seatRadius
                          : 1
                        const scaleThreshold =
                          4 / (radius as number) || 1
                        const opacityThreshold =
                          2 / (radius as number) || 1
                        const isHovered =
                          hoveredSection ===
                          section_key

                        let opacity = isHovered
                          ? 0.5
                          : 0
                        let displayseats = false

                        if (
                          transform.scale >
                          opacityThreshold &&
                          !displayOnly
                        ) {
                          const x =
                            (transform.x * -1) /
                            transform.scale +
                            width /
                            (transform.scale)
                          const y =
                            (transform.y * -1) /
                            transform.scale +
                            width /
                            (transform.scale)
                          const threshold =
                            width /
                            transform.scale +
                            width / 10

                          let minX = width
                          let maxX = 0
                          let minY = width
                          let maxY = 0

                          for (const point of Object.values(
                            section_val.points
                          )) {
                            const pointx =
                              (point.x as number * width) /
                              800
                            const pointy =
                              (point.y as number * width) /
                              800

                            if (
                              Math.abs(
                                pointx - x
                              ) <= threshold &&
                              Math.abs(
                                pointy - y
                              ) <= threshold
                            ) {
                              displayseats = true

                              if (
                                transform.scale >
                                scaleThreshold
                              ) {
                                opacity = 1
                              } else {
                                opacity =
                                  (transform.scale -
                                    opacityThreshold) /
                                  (scaleThreshold -
                                    opacityThreshold)
                              }
                            }

                            if (
                              pointx > maxX
                            ) {
                              maxX = pointx
                            }
                            if (
                              pointy > maxY
                            ) {
                              maxY = pointy
                            }
                            if (
                              pointx < minX
                            ) {
                              minX = pointx
                            }
                            if (
                              pointy < minY
                            ) {
                              minY = pointy
                            }
                          }

                          if (
                            x > minX &&
                            x < maxX &&
                            y > minY &&
                            y < maxY
                          ) {
                            displayseats = true

                            if (
                              transform.scale >
                              scaleThreshold
                            ) {
                              opacity = 1
                            } else {
                              opacity =
                                (transform.scale -
                                  opacityThreshold) /
                                (scaleThreshold -
                                  opacityThreshold)
                            }
                          }
                        }

                        if (!displayOnly) {
                          return (
                            <Fragment
                              key={section_key}
                            >
                              <g
                                onClick={(e) => {
                                  handleSectionClick(
                                    e,
                                    textX as number,
                                    textY as number,
                                    scaleThreshold
                                  )
                                }}
                                className={
                                  !displayOnly
                                    ? 'cursor-pointer'
                                    : ''
                                }
                                onMouseEnter={() => {
                                  setHoveredSection(
                                    section_key
                                  )
                                }}
                                onMouseLeave={() => {
                                  setHoveredSection(
                                    null
                                  )
                                }}
                              >
                                <path
                                  d={d}
                                  stroke="none"
                                  fill={color}
                                  fillOpacity={
                                    displayOnly
                                      ? 0.4
                                      : 1 -
                                      opacity +
                                      0.2
                                  }
                                />
                                <text
                                  x={textX}
                                  y={textY}
                                  textAnchor="middle"
                                  pointerEvents="none"
                                  dominantBaseline="central"
                                  fontSize={font}
                                  transform={`rotate(${rotationAngle},${textX},${textY})`}
                                  fill="white"
                                  opacity={
                                    1 - opacity + 0.2
                                  }
                                >
                                  {text}
                                </text>
                              </g>

                              {displayseats &&
                                !displayOnly && (
                                  <Fragment>
                                    {Object.entries(
                                      section_val?.seats
                                    ).map(
                                      ([
                                        layout_key,
                                        layout_val,
                                      ]) => {
                                        return (
                                          <g
                                            key={
                                              layout_key
                                            }
                                            transform={`translate(${layout_val.groupX},${layout_val.groupY}) rotate(${layout_val.angle})`}
                                            style={{
                                              cursor:
                                                'pointer',
                                            }}
                                          >
                                            {Object.entries(
                                              layout_val.seat_data
                                            ).map(
                                              ([
                                                seat_key,
                                                seat_val,
                                              ]) => {
                                                const seatDetail =
                                                  JSON.stringify(
                                                    {
                                                      seatKey:
                                                        seat_key,
                                                      sectionKey:
                                                        section_key,
                                                      layoutKey:
                                                        layout_key,
                                                    }
                                                  )
                                                const isSelected = selectedSeat ? selectedSeat.includes(seatDetail) : false
                                                const isHovered = hoveredSeat ? seatDetail === hoveredSeat : false

                                                let fillColor;

                                                if (isSelected) {
                                                  fillColor = '#1DB954'
                                                } else if (isHovered) {
                                                  fillColor = '#FFAC1C'
                                                } else {
                                                  fillColor = '#1890ff'
                                                }

                                                return (
                                                  <Fragment>
                                                    <g
                                                      key={seat_key}
                                                      onMouseEnter={
                                                        handleSeatHover
                                                      }
                                                      onMouseLeave={() => {
                                                        setHoveredSeat(
                                                          null
                                                        )
                                                      }}
                                                    >
                                                      <circle
                                                        cx={seat_val.x}
                                                        cy={seat_val.y}
                                                        r={layout_val.seatRadius}
                                                        fill={fillColor}
                                                        strokeWidth={0}
                                                        opacity={opacity}
                                                        data-key={seatDetail}
                                                      />
                                                    </g>

                                                  </Fragment>
                                                )
                                              }
                                            )}
                                          </g>
                                        )
                                      }
                                    )}
                                  </Fragment>
                                )}
                            </Fragment>
                          )
                        } else return null
                      }
                    )}
                </g>
              </svg>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 z-10 sm:bottom-5 sm:left-5 lg:bottom-6 lg:left-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1890ff]" />
                <span className="text-[9px] font-medium text-[#64748B] sm:text-[10px]">
                  Available
                </span>
              </div>
              <div className="hidden h-3 w-px bg-[#E2E8F0] sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d4f]" />
                <span className="text-[9px] font-medium text-[#64748B] sm:text-[10px]">
                  Occupied
                </span>
              </div>
              <div className="hidden h-3 w-px bg-[#E2E8F0] sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1DB954]" />
                <span className="text-[9px] font-medium text-[#64748B] sm:text-[10px]">
                  Selected
                </span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 right-3 z-10 sm:bottom-5 sm:right-5 lg:bottom-6 lg:right-6">
            <div className="hidden rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-[9px] font-medium text-[#64748B] shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl md:block">
              <span className="text-[#475569]">Drag</span>
              <span className="mx-1 text-[#CBD5E1]">•</span>
              <span className="text-[#475569]">Zoom</span>
              <span className="mx-1 text-[#CBD5E1]">•</span>
              <span className="text-[#6366F1]">Select</span>
            </div>
          </div>
        </section>

        <aside className="relative z-20 flex w-full flex-col border-t border-[#E6E8EF] bg-white lg:h-full lg:w-[360px] lg:min-w-[360px] lg:border-l lg:border-t-0 xl:w-[390px] xl:min-w-[390px]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7]" />

          <div className="shrink-0 border-b border-[#EEF0F4] px-5 pb-4 pt-5 sm:px-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[17px] font-bold tracking-[-0.02em] text-[#10192B]">
                    Your selection
                  </div>
                  {selectedSeat.length > 0 && (
                    <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[9px] font-bold text-[#6366F1]">
                      {selectedSeat.length}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[#94A3B8]">
                  Review your seats before checkout
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-600">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div
            className="
              scrollbar
              bg-[#FAFAFC]
              px-4
              py-4
              max-h-[500px]
              overflow-y-auto
              lg:min-h-0
              lg:max-h-none
              lg:flex-1
            "
          >
            {selectedSeat.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-[22px] bg-indigo-100 blur-xl opacity-50" />
                  <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border border-[#E7E9F4] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
                    <SofaIcon
                      size={27}
                      strokeWidth={1.6}
                      className="text-[#6366F1]"
                    />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Your seats are waiting
                </h3>
                <p className="mt-2 max-w-[230px] text-[11px] leading-5 text-[#94A3B8]">
                  Explore the venue map and select the seats you'd like to book.
                </p>
                <div className="mt-5 flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF2FF] text-[9px] text-[#6366F1]">
                    1
                  </span>
                  <span className="text-[10px] font-medium text-[#64748B]">
                    Select a seat from the map
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#A0A6B2]">
                    Selected seats
                  </span>
                  <span className="text-[10px] font-medium text-[#A0A6B2]">
                    Max 10
                  </span>
                </div>
                {selectedSeat.map(
                  (selected, index) => {
                    const {
                      seat,
                      data,
                      section,
                    } = getSeatData(selected)

                    if (!data) return null

                    return (
                      <div
                        key={`${seat.sectionKey}-${seat.layoutKey}-${seat.seatKey}`}
                        className="group relative overflow-hidden rounded-[18px] border border-[#E7E9F0] bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.035)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#C7D2FE] hover:shadow-[0_10px_30px_rgba(99,102,241,0.09)]"
                      >
                        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-[#6366F1] to-[#8B5CF6]" />
                        <div className="flex items-start justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] text-xs font-bold text-[#6366F1]">
                              {String(
                                index + 1
                              ).padStart(2, '0')}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-[#111827]">
                                Seat {data.seatName}
                              </p>
                              <p className="mt-1 truncate text-[10px] text-[#94A3B8]">
                                {`Section-${section?.name}`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              removeSeat(index)
                            }
                            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#B1B7C3] opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Remove seat"
                          >
                            ×
                          </button>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <div className="flex-1 rounded-xl bg-[#F8F9FC] px-3 py-2">
                            <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-[#A0A6B2]">
                              Price
                            </p>
                            <p className="mt-1 text-xs font-bold text-[#111827]">
                              ₹{data.seatPrice}
                            </p>
                          </div>
                          <div className="flex-1 rounded-xl bg-[#F8F9FC] px-3 py-2">
                            <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-[#A0A6B2]">
                              Tier
                            </p>
                            <p className="mt-1 truncate text-xs font-semibold capitalize text-[#475569]">
                              {data.seatTier ||
                                'Standard'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#E8EAF0] bg-white px-5 pb-5 pt-4 sm:px-6">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7B8494]">Tickets</span>
                <span className="font-semibold text-[#374151]">
                  {selectedSeat.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7B8494]">Subtotal</span>
                <span className="font-semibold text-[#374151]">
                  ₹{getTotalPrice()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#7B8494]">Taxes & fees</span>
                <span className="font-medium text-[#9CA3AF]">
                  Included
                </span>
              </div>
            </div>

            <div className="my-4 h-px bg-[#ECEEF3]" />

            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#A0A6B2]">
                  Total amount
                </p>
                <p className="mt-1 text-[25px] font-extrabold tracking-[-0.04em] text-[#111827]">
                  ₹{getTotalPrice()}
                </p>
              </div>
              <div className="mb-1 flex items-center gap-1.5 rounded-full bg-[#F8F9FC] px-2.5 py-1.5">
                <ShieldCheck
                  size={12}
                  className="text-emerald-500"
                />
                <span className="text-[9px] font-semibold text-[#7B8494]">
                  Secure
                </span>
              </div>
            </div>

            <button
              disabled={
                selectedSeat.length === 0
              }
              className="group relative flex h-[48px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-r from-[#6366F1] via-[#6D5DE7] to-[#8B5CF6] text-xs font-bold text-white shadow-[0_10px_25px_rgba(99,102,241,0.22)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(99,102,241,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:transform-none disabled:bg-[#E5E7EB] disabled:bg-none disabled:text-[#9CA3AF] disabled:shadow-none"
            >
              <span className="absolute inset-y-0 -left-[100%] w-1/2 skew-x-[-20deg] bg-white/10 transition-all duration-700 group-hover:left-[130%]" />
              <span className="relative">
                {selectedSeat.length === 0
                  ? 'Select seats to continue'
                  : `Continue · ₹${getTotalPrice()}`}
              </span>
              {selectedSeat.length > 0 && (
                <span className="relative ml-2 text-base transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowRightIcon size={20} />
                </span>
              )}
            </button>

            <p className="mt-3 text-center text-[9px] leading-4 text-[#A0A6B2]">
              Your seats will be temporarily reserved while you complete checkout.
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default UserDisplay