import React, { Fragment, useEffect, useRef } from 'react'
import { useParams,Link } from 'react-router-dom'

function List() {
  const { type } = useParams()
  const events = useRef([])
  const venues = useRef([])

  const getAllEvents = async () => {
    const URL = 'http://localhost:5000/api/admin/getAllEvents'
    
    try {
      const response = await axios.get(URL)
      events.current = response.data
    } catch (error) {
      console.error(error)
    }
  }
  
  const getAllVenues = async () => {
    const URL = 'http://localhost:5000/api/admin/getAllVenues'
    
    try {
      const response = await axios.get(URL)
      venues.current = response.data
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(()=>{
    if(type === 'event'){
      // getAllEvents()
    }else{
      // getAllVenues()
    }
  },[])

  return (
    <>
      <div className='m-1'>
        <label htmlFor={type} className='m-1'>{`Choose ${type==='event' ? 'an' : 'a'} ${type}`}</label>
        <select name={type} id={type} className='border rounded pl-1 m-1'>
          {type === 'event' ?
            (
              <Fragment>
                <option value=''>{`-- Choose an Event --`}</option>
                {events.current.map((element, index) => {
                  <option key={index} value={element.id}>
                    <Link to={`/event/${element.id}`}>{element.title}</Link>
                  </option>
                })}
              </Fragment>
            ) :
            (
              <Fragment>
                <option value=''>{`-- Choose a Venue --`}</option>
                {venues.current.map((element, index) => {
                  return (
                    <option key={index} value={element.id}>
                      <Link to={`/venue/${element.id}`}>{`${element.name}, ${element.city}, ${element.state}, ${element.country}, ${element.pincode}`}</Link>
                    </option>
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
