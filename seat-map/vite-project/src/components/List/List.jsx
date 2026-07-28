import React, { Fragment, useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

function List() {
  const { type } = useParams()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])

  const getAllEvents = async () => {
    const URL = 'http://localhost:5000/api/events/'

    try {
      const response = await axios.get(URL)
      console.log(response.data)
      setEvents(response.data.events)
    } catch (error) {
      console.error(error)
    }
  }

  const getAllVenues = async () => {
    const URL = 'http://localhost:5000/api/events/venues'

    try {
      const response = await axios.get(URL)
      setVenues(response.data.venues)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSelectChange = (e)=>{
    
    if(e.target.value){
      console.log(e.target.value)
      if(type === 'event'){
        navigate(`/event/${e.target.value}`)
      }else{
        navigate(`/event/${e.target.value}`)
      }
    }
    
  }


  useEffect(() => {
    if (type === 'event') {
      getAllEvents()
    } else {
      getAllVenues()
    }
  }, [])

  return (
    <>
      <div className='m-1'>
        <label htmlFor={type} className='m-1'>{`Choose ${type === 'event' ? 'an' : 'a'} ${type}`}</label>
        <select name={type} id={type} className='border rounded pl-1 m-1 cursor-pointer' onChange={handleSelectChange}>
          {type === 'event' ?
            (
              <Fragment>
                <option value=''>{`-- Choose an Event --`}</option>
                {events.map((element, index) => {
                  return (
                    <option key={index} value={element.id}>{element.title}</option>
                  )
                })}
              </Fragment>
            ) :
            (
              <Fragment>
                <option value=''>{`-- Choose a Venue --`}</option>
                {venues.map((element, index) => {
                  return (
                    <option key={index} value={element.id}> {`${element.name}, ${element.city}, ${element.state}, ${element.country}, ${element.pincode}`} </option>
                  )
                })}
              </Fragment>
            )
          }
        </select>
      </div>
    </>
  )
}

export default List
